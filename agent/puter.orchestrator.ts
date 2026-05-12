import { buildSystemPrompt, getPuterModel } from './puter.client'
import { dispatchTool } from './tools/dispatcher'
import { saveMessage } from '../db/sqlite'

// Dynamic import for ESM module
let puter: any = null
async function getPuter() {
  if (!puter) {
    puter = await import('@heyputer/puter.js').then(m => m.default || m)
  }
  return puter
}

export async function runAgentPuter(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  sessionId: string,
  onChunk: (text: string) => void,
  onToolCall?: (tool: string, args: any) => void
): Promise<string> {

  const systemPrompt = buildSystemPrompt([])
  const model = getPuterModel()

  // Get Puter instance
  const puterInstance = await getPuter()

  // Build conversation history for Puter
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage }
  ]

  let finalText = ''
  const MAX_TOOL_ROUNDS = 5

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`🔄 Puter round ${round + 1}`)

      // Call Puter AI with function calling support
      const response = await puterInstance.ai.chat(messages, {
        model,
        stream: false, // We'll handle streaming manually for consistency
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the internet for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: { 
                    type: 'string', 
                    description: 'The search query' 
                  }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'execute_code',
              description: 'Execute JavaScript code and return the result',
              parameters: {
                type: 'object',
                properties: {
                  code: { 
                    type: 'string', 
                    description: 'JavaScript code to execute' 
                  }
                },
                required: ['code']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'read_file',
              description: 'Read the contents of a file',
              parameters: {
                type: 'object',
                properties: {
                  path: { 
                    type: 'string', 
                    description: 'File path' 
                  }
                },
                required: ['path']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'write_file',
              description: 'Write content to a file',
              parameters: {
                type: 'object',
                properties: {
                  path: { 
                    type: 'string', 
                    description: 'File path' 
                  },
                  content: { 
                    type: 'string', 
                    description: 'File content' 
                  }
                },
                required: ['path', 'content']
              }
            }
          }
        ]
      })

      // Handle response content
      if (response.message?.content) {
        const content = response.message.content
        finalText += content
        onChunk(content)
      }

      // Check for tool calls
      const toolCalls = response.message?.tool_calls || []
      
      if (toolCalls.length === 0) {
        // No more tool calls, we're done
        break
      }

      console.log(`🔧 Executing ${toolCalls.length} tool(s)`)

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: response.message.content || '',
        tool_calls: toolCalls
      } as any)

      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          try {
            const args = toolCall.function.arguments
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args
            
            onToolCall?.(toolCall.function.name, parsedArgs)
            const result = await dispatchTool(toolCall.function.name, parsedArgs)
            
            console.log(`✅ Tool ${toolCall.function.name} completed`)
            
            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            }
          } catch (err: any) {
            console.error(`❌ Tool ${toolCall.function.name} failed:`, err)
            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${err.message}`
            }
          }
        })
      )

      // Add tool results to messages
      messages.push(...toolResults as any)
    }

    // Save messages to database
    try {
      saveMessage('user', userMessage, sessionId)
      saveMessage('assistant', finalText, sessionId)
    } catch (e) {
      console.error('Failed to save messages:', e)
    }

  } catch (err: any) {
    console.error('❌ Puter error:', err)
    
    // Check if it's an authentication error
    if (err.message?.includes('auth') || err.message?.includes('sign in')) {
      const errMsg = `\n\n⚠️ Error: Please sign in to Puter to use AI features. Puter will prompt you to authenticate.`
      finalText += errMsg
      onChunk(errMsg)
    } else {
      const errMsg = `\n\n⚠️ Error: ${err.message}`
      finalText += errMsg
      onChunk(errMsg)
    }
  }

  return finalText
}
