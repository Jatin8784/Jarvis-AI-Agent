import { getClaudeClient, buildSystemPrompt } from './claude.client'
import { dispatchTool } from './tools/dispatcher'
import store from './store'
import { saveMessage } from '../db/sqlite'

const claudeTools = [
  {
    name: 'web_search',
    description: 'Search the internet for current information',
    input_schema: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'The search query' 
        }
      },
      required: ['query']
    }
  },
  {
    name: 'execute_code',
    description: 'Execute JavaScript code and return the result',
    input_schema: {
      type: 'object',
      properties: {
        code: { 
          type: 'string', 
          description: 'JavaScript code to execute' 
        }
      },
      required: ['code']
    }
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem',
    input_schema: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: 'Absolute or relative path to the file' 
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write or create a file on the filesystem',
    input_schema: {
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
      required: ['path', 'content']
    }
  }
]

export async function runAgentClaude(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  sessionId: string,
  onChunk: (text: string) => void,
  onToolCall?: (tool: string, args: any) => void
): Promise<string> {

  const client = getClaudeClient()
  const systemPrompt = buildSystemPrompt([])
  const model = (store.get('model') as string) || 'claude-3-5-sonnet-20241022'

  const messages: any[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ]

  let finalText = ''
  const MAX_TOOL_ROUNDS = 5

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`🔄 Claude round ${round + 1}`)

      const stream = await client.messages.stream({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: claudeTools,
      })

      let currentContent = ''
      let toolUses: any[] = []

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentContent += event.delta.text
            finalText += event.delta.text
            onChunk(event.delta.text)
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            toolUses.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {}
            })
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'input_json_delta') {
            const lastTool = toolUses[toolUses.length - 1]
            if (lastTool) {
              lastTool.input = { ...lastTool.input, ...JSON.parse(event.delta.partial_json || '{}') }
            }
          }
        }
      }

      if (toolUses.length === 0) {
        break
      }

      console.log(`🔧 Executing ${toolUses.length} tool(s)`)

      // Add assistant message with tool uses
      messages.push({
        role: 'assistant',
        content: [
          ...(currentContent ? [{ type: 'text', text: currentContent }] : []),
          ...toolUses.map(t => ({ type: 'tool_use', id: t.id, name: t.name, input: t.input }))
        ]
      })

      // Execute tools
      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => {
          try {
            onToolCall?.(toolUse.name, toolUse.input)
            const result = await dispatchTool(toolUse.name, toolUse.input)
            
            console.log(`✅ Tool ${toolUse.name} completed`)
            
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            }
          } catch (err: any) {
            console.error(`❌ Tool ${toolUse.name} failed:`, err)
            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${err.message}`,
              is_error: true
            }
          }
        })
      )

      // Add tool results
      messages.push({
        role: 'user',
        content: toolResults
      })
    }

    // Save messages
    try {
      saveMessage('user', userMessage, sessionId)
      saveMessage('assistant', finalText, sessionId)
    } catch (e) {
      console.error('Failed to save messages:', e)
    }

  } catch (err: any) {
    console.error('❌ Claude error:', err)
    const errMsg = `\n\n⚠️ Error: ${err.message}`
    finalText += errMsg
    onChunk(errMsg)
  }

  return finalText
}
