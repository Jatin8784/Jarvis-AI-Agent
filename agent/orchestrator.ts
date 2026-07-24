import { getGeminiClient, buildSystemPrompt } from './gemini.client'
import { geminiTools } from './tools/registry'
import { dispatchTool } from './tools/dispatcher'
import { getRecentContext, saveMessage } from '../db/sqlite'
import store from './store'

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a 503 (high demand) error
      if (error.message?.includes('503') || error.message?.includes('high demand')) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // For other errors, don't retry
        throw error
      }
    }
  }
  
  throw lastError
}

export async function runAgent(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  sessionId: string,
  onChunk: (text: string) => void,
  onToolCall?: (tool: string, args: any) => void
): Promise<string> {

  let finalText = ''
  const MAX_TOOL_ROUNDS = 5

  try {
    const model = getGeminiClient()
    const systemPrompt = buildSystemPrompt([])

    const chatHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content || ' ' }], // Ensure parts are never empty
    }))

    // Ensure roles alternate correctly: history must end with a 'model' message 
    // since the next message we send is always from the 'user'.
    const validHistory = []
    let lastRole = null
    for (const msg of chatHistory) {
      if (msg.role !== lastRole) {
        validHistory.push(msg)
        lastRole = msg.role
      }
    }

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: "Understood. I am JARVIS, your advanced AI desktop assistant. All systems online. How can I assist you today?" }],
        },
        ...validHistory,
      ],
      tools: [{ functionDeclarations: geminiTools }],
    })

    console.log(`🔧 Registered ${geminiTools.length} tools with Gemini`)

    // Check if user message needs web search (force it if needed)
    const needsWebSearch = /\b(today|tomorrow|yesterday|now|current|latest|ipl|match|score|news|weather|who wins|who won)\b/i.test(userMessage)
    
    if (needsWebSearch) {
      console.log('🔍 Detected need for web search, forcing tool call')
      
      // Build a better search query with date context
      let searchQuery = userMessage
      const today = new Date()
      const year = today.getFullYear()
      
      // Check if it's an IPL/cricket query
      const isIPLQuery = /\b(ipl|cricket|match|who wins|who won)\b/i.test(userMessage)
      
      if (/\byesterday\b/i.test(userMessage)) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const dateStr = yesterday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const shortDate = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        if (isIPLQuery) {
          // For IPL queries, be very specific
          searchQuery = `IPL ${year} match ${shortDate} ${year} result winner`
          console.log(`📅 Enhanced IPL query: ${searchQuery}`)
        } else {
          searchQuery = userMessage.replace(/\byesterday\b/i, dateStr)
          console.log(`📅 Enhanced query with yesterday's date: ${searchQuery}`)
        }
      } else if (/\btomorrow\b/i.test(userMessage)) {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateStr = tomorrow.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const shortDate = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        if (isIPLQuery) {
          searchQuery = `IPL ${year} match ${shortDate} ${year} schedule teams venue time`
          console.log(`📅 Enhanced IPL query: ${searchQuery}`)
        } else {
          searchQuery = userMessage.replace(/\btomorrow\b/i, dateStr)
          console.log(`📅 Enhanced query with date: ${searchQuery}`)
        }
      } else if (/\btoday\b/i.test(userMessage)) {
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const shortDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        if (isIPLQuery) {
          searchQuery = `IPL ${year} match ${shortDate} ${year} live score teams venue`
          console.log(`📅 Enhanced IPL query: ${searchQuery}`)
        } else {
          searchQuery = userMessage.replace(/\btoday\b/i, dateStr)
          console.log(`📅 Enhanced query with date: ${searchQuery}`)
        }
      } else if (isIPLQuery && !userMessage.includes(year.toString())) {
        // If it's an IPL query but doesn't have the year, add it
        searchQuery = `${userMessage} IPL ${year}`
        console.log(`📅 Enhanced IPL query with year: ${searchQuery}`)
      }
      
      // Manually call web search first
      onToolCall?.('web_search', { query: searchQuery })
      const searchResult = await dispatchTool('web_search', { query: searchQuery })
      console.log(`✅ Forced web search result:`, searchResult.substring(0, 200))
      
      // Now send the search result to Gemini with retry
      const enhancedMessage = `${userMessage}\n\n[Web Search Results]:\n${searchResult}\n\nBased on the above search results, provide a direct answer.`
      console.log('📤 Sending enhanced message with search results')
      
      const stream = await retryWithBackoff(() => chat.sendMessageStream(enhancedMessage))
      
      for await (const chunk of stream.stream) {
        try {
          const text = chunk.text()
          if (text) {
            finalText += text
            onChunk(text)
          }
        } catch (e) {
          // Skip chunks that don't contain text
        }
      }
      
      console.log('✅ Final response length:', finalText.length)
      return finalText
    }

    // Normal flow for non-search queries
    console.log('📤 Sending user message:', userMessage)
    const stream = await retryWithBackoff(() => chat.sendMessageStream(userMessage))

    for await (const chunk of stream.stream) {
      try {
        const text = chunk.text()
        if (text) {
          console.log('📝 Chunk:', text)
          finalText += text
          onChunk(text)
        }
      } catch (e) {
        // Skip chunks that don't contain text (e.g. function calls)
      }
    }

    const response = await stream.response
    let functionCalls = response.functionCalls()

    console.log(`📊 Gemini response - functionCalls: ${functionCalls?.length || 0}`)

    // Handle tool calls in a loop
    let round = 0
    const toolsUsed: Array<{ name: string; args: any }> = []
    const deletedPaths = new Set<string>() // Track deleted files to prevent duplicates
    let deleteCallCount = 0 // Track total delete calls in this request
    const MAX_DELETE_CALLS = 1 // Only allow 1 delete per user request
    
    while (functionCalls && functionCalls.length > 0 && round < MAX_TOOL_ROUNDS) {
      round++
      console.log(`🔄 Tool round ${round}, ${functionCalls.length} calls`)
      onChunk('\n\n')

      const toolResults = await Promise.all(
        functionCalls.map(async (call) => {
          onToolCall?.(call.name, call.args)
          
          // Safety check: prevent multiple delete calls in single request
          if (call.name === 'delete_file') {
            deleteCallCount++
            const path = call.args?.path || ''
            
            // Block if we've already done a delete in this request
            if (deleteCallCount > MAX_DELETE_CALLS) {
              console.warn(`⚠️ BLOCKED: Too many delete calls in single request (${deleteCallCount}/${MAX_DELETE_CALLS})`)
              return {
                functionResponse: {
                  name: call.name,
                  response: {
                    name: call.name,
                    content: `⚠️ BLOCKED: Only one delete operation allowed per request for safety. The first file was already deleted.`
                  },
                },
              }
            }
            
            // Also check for exact duplicate paths
            if (deletedPaths.has(path)) {
              console.warn(`⚠️ Skipping duplicate delete call for: ${path}`)
              return {
                functionResponse: {
                  name: call.name,
                  response: {
                    name: call.name,
                    content: `⚠️ Skipped: This file was already deleted in this request.`
                  },
                },
              }
            }
            deletedPaths.add(path)
          }
          
          toolsUsed.push({ name: call.name, args: call.args })
          
          // Pass geminiClient for vision-based tools
          const result = await dispatchTool(call.name, call.args as Record<string, any>, model)
          console.log(`✅ Tool ${call.name} result:`, result.substring(0, 100))
          return {
            functionResponse: {
              name: call.name,
              response: {
                name: call.name,
                content: result
              },
            },
          }
        })
      )

      // Send tool results back and get response
      console.log('📤 Sending tool results back')
      const toolStream = await retryWithBackoff(() => chat.sendMessageStream(toolResults))

      for await (const chunk of toolStream.stream) {
        try {
          const text = chunk.text()
          if (text) {
            console.log('📝 Tool response chunk:', text)
            finalText += text
            onChunk(text)
          }
        } catch (e) {
          // Skip chunks that don't contain text
        }
      }

      const toolResponse = await toolStream.response
      functionCalls = toolResponse.functionCalls()
      console.log('🔍 More function calls?', functionCalls?.length || 0)
    }

    // If no text was generated after tool calls, generate a meaningful completion message
    if (round > 0 && finalText.trim().length === 0) {
      let completionMsg = '✅ **Task Completed**\n\n'
      
      // Generate summary based on tools used
      const toolCounts = toolsUsed.reduce((acc, tool) => {
        acc[tool.name] = (acc[tool.name] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const summaries: string[] = []
      
      for (const [toolName, count] of Object.entries(toolCounts)) {
        switch (toolName) {
          case 'read_file':
            summaries.push(`📄 Read ${count} file${count > 1 ? 's' : ''}`)
            break
          case 'write_file':
            summaries.push(`📝 Created/wrote ${count} file${count > 1 ? 's' : ''}`)
            break
          case 'delete_file':
            summaries.push(`🗑️ Deleted ${count} file${count > 1 ? 's' : ''}/folder${count > 1 ? 's' : ''}`)
            break
          case 'append_text':
            summaries.push(`➕ Added text to ${count} file${count > 1 ? 's' : ''}`)
            break
          case 'edit_file':
            summaries.push(`✏️ Edited ${count} file${count > 1 ? 's' : ''}`)
            break
          case 'list_directory':
            summaries.push(`📁 Listed ${count} director${count > 1 ? 'ies' : 'y'}`)
            break
          case 'web_search':
            summaries.push(`🔍 Performed ${count} web search${count > 1 ? 'es' : ''}`)
            break
          case 'execute_code':
            summaries.push(`⚙️ Executed ${count} code snippet${count > 1 ? 's' : ''}`)
            break
          case 'speak':
            summaries.push(`🔊 Spoke ${count} message${count > 1 ? 's' : ''}`)
            break
          case 'get_system_info':
            summaries.push(`💻 Retrieved system information`)
            break
          default:
            summaries.push(`🔧 Used ${toolName} ${count} time${count > 1 ? 's' : ''}`)
        }
      }
      
      if (summaries.length > 0) {
        completionMsg += summaries.join('\n') + '\n\n'
      }
      
      completionMsg += 'All operations completed successfully!'
      
      finalText = completionMsg
      onChunk(completionMsg)
      console.log('✅ Added detailed completion message')
    }

    console.log('✅ Final response length:', finalText.length)

  } catch (err: any) {
    console.error('❌ Agent error:', err)
    
    // If it's a 503 error after retries, suggest switching models
    if (err.message?.includes('503') || err.message?.includes('high demand')) {
      const errMsg = `\n\n⚠️ Error: Gemini ${store.get('model')} is experiencing high demand.\n\n💡 **Quick Fix:**\n1. Open Settings\n2. Change model to "Gemini 2.0 Flash" (less demand)\n3. Try again\n\nOr wait a few minutes and retry.`
      finalText += errMsg
      onChunk(errMsg)
    } else {
      const errMsg = `\n\n⚠️ Error: ${err.message}`
      finalText += errMsg
      onChunk(errMsg)
    }
  }

  try {
    saveMessage('user', userMessage, sessionId)
    saveMessage('assistant', finalText, sessionId)
  } catch (e) {
    console.error('Failed to save messages:', e)
  }

  // TTS is centralized in the agent IPC handler now so every provider
  // (Gemini, Ollama, DeepSeek, Claude, Groq, MiniMax) speaks consistently.

  return finalText
}
