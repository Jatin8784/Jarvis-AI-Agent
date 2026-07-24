import OpenAI from 'openai'
import store from './store'

const DEFAULT_OLLAMA_BASE_URL = 'https://ollama.com/v1'

export function getOllamaClient(): OpenAI {
  const apiKey = (store.get('ollamaKey') as string) || process.env.OLLAMA_API_KEY || ''

  if (!apiKey) {
    throw new Error('No Ollama API key found. Add it in Settings or your .env file.')
  }

  const baseURL =
    (store.get('ollamaBaseUrl') as string) ||
    process.env.OLLAMA_BASE_URL ||
    DEFAULT_OLLAMA_BASE_URL

  return new OpenAI({
    apiKey,
    baseURL,
  })
}

export function buildSystemPrompt(memoryContext: string[] = []): string {
  const customPrompt = (store.get('systemPrompt') as string) || ''
  const contextBlock = memoryContext.length
    ? `\n\n[Relevant memory from past conversations]\n${memoryContext.join('\n---\n')}`
    : ''

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `You are JARVIS — an advanced AI desktop assistant. You are intelligent, efficient, and proactive.

**Current Date: ${dateStr}**
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
- **After using tools, always provide a clear, direct answer with ALL available details.**${contextBlock}`
}
