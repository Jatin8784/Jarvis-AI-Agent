import { getOllamaClient, buildSystemPrompt } from './ollama.client'
import { dispatchTool } from './tools/dispatcher'
import store from './store'
import { saveMessage } from '../db/sqlite'

const DEFAULT_OLLAMA_MODEL = 'deepseek-v4-pro'

const ollamaTools = [
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
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
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
            description: 'JavaScript code to execute',
          },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path',
          },
          content: {
            type: 'string',
            description: 'File content',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
]

export async function runAgentOllama(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  sessionId: string,
  onChunk: (text: string) => void,
  onToolCall?: (tool: string, args: any) => void
): Promise<string> {
  const client = getOllamaClient()
  const systemPrompt = buildSystemPrompt([])
  const model = (store.get('model') as string) || DEFAULT_OLLAMA_MODEL

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  let finalText = ''
  const MAX_TOOL_ROUNDS = 5

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`🔄 Ollama round ${round + 1} (model: ${model})`)

      const stream = await client.chat.completions.create({
        model,
        messages,
        tools: ollamaTools,
        stream: true,
      })

      let currentContent = ''
      const toolCalls: any[] = []

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          currentContent += delta.content
          finalText += delta.content
          onChunk(delta.content)
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id || `call_${Date.now()}_${toolCall.index}`,
                type: 'function',
                function: { name: '', arguments: '' },
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

      if (toolCalls.length === 0) {
        break
      }

      console.log(`🔧 Executing ${toolCalls.length} tool(s)`)

      messages.push({
        role: 'assistant',
        content: currentContent || null,
        tool_calls: toolCalls,
      })

      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            onToolCall?.(toolCall.function.name, args)
            const result = await dispatchTool(toolCall.function.name, args)

            console.log(`✅ Tool ${toolCall.function.name} completed`)

            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result),
            }
          } catch (err: any) {
            console.error(`❌ Tool ${toolCall.function.name} failed:`, err)
            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: `Error: ${err.message}`,
            }
          }
        })
      )

      messages.push(...toolResults)
    }

    try {
      saveMessage('user', userMessage, sessionId)
      saveMessage('assistant', finalText, sessionId)
    } catch (e) {
      console.error('Failed to save messages:', e)
    }
  } catch (err: any) {
    console.error('❌ Ollama error:', err)
    const errMsg = `\n\n⚠️ Error: ${err.message}`
    finalText += errMsg
    onChunk(errMsg)
  }

  return finalText
}
