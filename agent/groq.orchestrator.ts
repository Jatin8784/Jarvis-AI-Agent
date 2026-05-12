import { getGroqClient, buildSystemPrompt } from './groq.client'
import { dispatchTool } from './tools/dispatcher'
import store from './store'
import { saveMessage } from '../db/sqlite'

// Convert tools to Groq function format
const groqTools = [
  {
    type: 'function' as const,
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
        required: ['query'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function' as const,
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
        required: ['code'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: { 
            type: 'string', 
            description: 'Absolute or relative path to the file' 
          }
        },
        required: ['path'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write or create a file on the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: { 
            type: 'string', 
            description: 'Absolute or relative path for the file' 
          },
          content: { 
            type: 'string', 
            description: 'Content to write to the file' 
          }
        },
        required: ['path', 'content'],
        additionalProperties: false
      }
    }
  }
]

export async function runAgentGroq(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  sessionId: string,
  onChunk: (text: string) => void,
  onToolCall?: (tool: string, args: any) => void
): Promise<string> {

  const client = getGroqClient()
  const systemPrompt = buildSystemPrompt([])
  const model = (store.get('model') as string) || 'llama-3.3-70b-versatile'

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ]

  let finalText = ''
  const MAX_TOOL_ROUNDS = 5

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`🔄 Groq round ${round + 1}`)

      const stream = await client.chat.completions.create({
        model,
        messages,
        tools: groqTools,
        tool_choice: 'auto',
        stream: true,
      })

      let currentContent = ''
      let toolCalls: any[] = []
      let hasContent = false
      let finishReason = ''

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        const chunkFinishReason = chunk.choices[0]?.finish_reason

        if (chunkFinishReason) {
          finishReason = chunkFinishReason
        }

        if (delta?.content) {
          currentContent += delta.content
          finalText += delta.content
          hasContent = true
          onChunk(delta.content)
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id || `call_${Date.now()}_${toolCall.index}`,
                type: 'function',
                function: { name: '', arguments: '' }
              }
            }
            if (toolCall.function?.name) {
              toolCalls[toolCall.index].function.name = toolCall.function.name
            }
            if (toolCall.function?.arguments) {
              toolCalls[toolCall.index].function.arguments += toolCall.function.arguments
            }
          }
        }
      }

      console.log(`📊 Groq response - finish_reason: ${finishReason}, hasContent: ${hasContent}, toolCalls: ${toolCalls.length}`)

      // If we got content and no tool calls, we're done
      if (hasContent && toolCalls.length === 0) {
        break
      }

      // If no tool calls at all, break
      if (toolCalls.length === 0) {
        break
      }

      // Execute tools
      console.log(`🔧 Executing ${toolCalls.length} tool(s)`)
      
      messages.push({ 
        role: 'assistant', 
        content: currentContent || null, 
        tool_calls: toolCalls 
      })

      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            // Validate and parse arguments
            let args: any
            try {
              args = JSON.parse(toolCall.function.arguments)
              console.log(`🔧 Calling tool: ${toolCall.function.name}`, args)
            } catch (parseErr) {
              console.error(`❌ Failed to parse tool arguments:`, toolCall.function.arguments)
              return {
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: `Error: Invalid JSON arguments`
              }
            }

            onToolCall?.(toolCall.function.name, args)
            const result = await dispatchTool(toolCall.function.name, args)
            
            console.log(`✅ Tool ${toolCall.function.name} result:`, result?.substring(0, 200))
            
            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            }
          } catch (err: any) {
            console.error(`❌ Tool ${toolCall.function.name} failed:`, err)
            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: `Error: ${err.message}`
            }
          }
        })
      )

      messages.push(...toolResults)
    }

    // Save messages to database
    try {
      saveMessage('user', userMessage, sessionId)
      saveMessage('assistant', finalText, sessionId)
    } catch (e) {
      console.error('Failed to save messages:', e)
    }

  } catch (err: any) {
    console.error('❌ Groq error:', err)
    const errMsg = `\n\n⚠️ Error: ${err.message}`
    finalText += errMsg
    onChunk(errMsg)
  }

  return finalText
}
