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
  onToolCall: (toolName: string, args: any) => void,
  imageDataUrls?: Array<{ name: string; dataUrl: string }>
): Promise<string> {
  const puter = await getPuter()

  // Set auth token if available
  const settings = await (window as any).jarvis?.getSettings()
  const puterToken = settings?.puterToken || ''
  if (puterToken && puter.authToken !== puterToken) {
    puter.authToken = puterToken
  }

  let fullResponse = ''

  try {
    console.log(`🤖 Calling Puter.js with model: ${model}`)

    // Build messages array (OpenAI format)
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add history
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Build user message — with vision support if images are attached
    if (imageDataUrls && imageDataUrls.length > 0) {
      // Multi-modal message with images
      const content: any[] = []

      // Add images first
      for (const img of imageDataUrls) {
        content.push({
          type: 'image_url',
          image_url: { url: img.dataUrl },
        })
      }

      // Add text
      content.push({ type: 'text', text: userMessage })

      messages.push({ role: 'user', content })
    } else {
      messages.push({ role: 'user', content: userMessage })
    }

    // Determine model string for Puter
    const modelStr = model.includes('/') ? model : undefined

    // Call Puter AI with messages array
    const response = await puter.ai.chat(messages, {
      model: modelStr || model,
    })

    console.log('📦 Puter response:', response)

    // Handle different response formats
    let content = ''

    if (typeof response === 'string') {
      content = response
    } else if (response?.message?.content) {
      content = response.message.content
    } else if (response?.content) {
      content = response.content
    } else if (response?.choices?.[0]?.message?.content) {
      content = response.choices[0].message.content
    } else if (response?.text) {
      content = response.text
    } else if (typeof response?.toString === 'function' && response.toString() !== '[object Object]') {
      content = response.toString()
    }

    if (!content) {
      console.error('❌ Puter response structure:', JSON.stringify(response, null, 2))
      throw new Error('Invalid response from Puter.js - no content returned')
    }

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
    day: 'numeric',
  })

  const userName = localStorage.getItem('userName') || 'Jatin'

  return `You are JARVIS — an advanced AI desktop assistant. You are intelligent, efficient, and proactive.

**USER NAME: ${userName}**
**Current Date: ${dateStr}**

**IMPORTANT: The user's name is ${userName}. Address them by name when appropriate.**
${customPrompt ? `\n[Additional Instructions]\n${customPrompt}\n` : ''}
Guidelines:
- Be concise but thorough.
- Format responses in markdown when helpful.
- When writing code, ALWAYS show the code in your response using markdown code blocks.
- Give direct answers, don't just link to websites.`
}
