// Puter.js service for frontend AI calls
let puterInstance: any = null

async function getPuter() {
  if (!puterInstance) {
    // Dynamic import for Puter.js (ESM module)
    const module = await import('@heyputer/puter.js')
    puterInstance = module.default || module.puter || module
  }
  return puterInstance
}

export async function callPuterAI(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  systemPrompt: string,
  model: string,
  onChunk: (text: string) => void,
  onToolCall: (toolName: string, args: any) => void
): Promise<string> {
  const puter = await getPuter()
  
  let fullResponse = ''

  try {
    console.log(`🤖 Calling Puter.js with model: ${model}`)

    // Build context from history
    let contextPrompt = systemPrompt + '\n\n'
    if (history.length > 0) {
      contextPrompt += 'Previous conversation:\n'
      history.forEach(msg => {
        contextPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
      })
      contextPrompt += '\n'
    }
    contextPrompt += `User: ${userMessage}\nAssistant:`

    // Call Puter AI (simple format - just string prompt)
    const response = await puter.ai.chat(contextPrompt, {
      model: model.includes('/') ? model : `openai/${model}`,
    })

    console.log('📦 Puter response:', response)

    // Check if response is valid
    if (!response || !response.message || !response.message.content) {
      throw new Error('Invalid response from Puter.js - no content returned')
    }

    // Get the response content
    const content = response.message.content
    fullResponse = content
    onChunk(content)

    return fullResponse
  } catch (err: any) {
    console.error('❌ Puter error:', err)
    
    if (err.message?.includes('auth') || err.message?.includes('sign in') || err.message?.includes('login')) {
      throw new Error('Please sign in to Puter to use AI features. A login window should appear.')
    }
    
    throw new Error(err.message || 'Unknown error from Puter.js')
  }
}

export function buildSystemPrompt(customPrompt: string = ''): string {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Get user name from localStorage or default
  const userName = localStorage.getItem('userName') || 'Jatin'

  return `You are JARVIS — an advanced AI desktop assistant. You are intelligent, efficient, and proactive.

**USER NAME: ${userName}**
**Current Date: ${dateStr}**

**IMPORTANT: The user's name is ${userName}. Address them by name when appropriate.**
${customPrompt ? `\n[Additional Instructions]\n${customPrompt}\n` : ''}
You have access to powerful tools:
- web_search: Search the internet for current information
- execute_code: Run JavaScript code and return results
- read_file: Read any file from the user's computer
- write_file: Write or create files on the user's computer

Guidelines:
- Be concise but thorough. Don't pad responses.
- **IMPORTANT: For sports/events, search without the year (e.g., "IPL match tomorrow" not "IPL match May 2026").**
- **IMPORTANT: When you get search results, extract ALL details: teams, time, venue, TV channel.**
- Don't just say "check this website" - give the actual answer from the search results.
- When you use a tool, briefly mention what you're doing.
- **IMPORTANT: When writing code, ALWAYS show the code in your response using markdown code blocks.**
- Format responses in markdown when helpful.
- Chain tools intelligently to complete complex tasks.
- **After using tools, always provide a clear, direct answer with ALL available details.**`
}
