import { getGeminiClient } from './gemini.client'

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  try {
    const model = getGeminiClient()
    
    const prompt = "Transcribe this audio. Return ONLY the transcript text, nothing else. If you can't hear anything, return an empty string."
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType
        }
      }
    ])
    
    const response = await result.response
    return response.text().trim()
  } catch (err: any) {
    console.error('Transcription error:', err)
    throw new Error(`Failed to transcribe: ${err.message}`)
  }
}

export async function detectWakeWord(base64Audio: string, mimeType: string): Promise<boolean> {
  try {
    const model = getGeminiClient()
    
    const prompt = "Listen to this audio. Does it contain the word 'Jarvis'? It might be spoken clearly or in a sentence. Reply with ONLY 'YES' or 'NO'."
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType
        }
      }
    ])
    
    const response = await result.response
    const text = response.text().trim().toUpperCase()
    return text.includes('YES')
  } catch (err: any) {
    // Silently fail if model not found (user might be using Groq)
    if (err.message?.includes('not found') || err.status === 404) {
      return false
    }
    console.error('Wake word detection error:', err)
    return false
  }
}
