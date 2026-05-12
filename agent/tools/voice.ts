const say = require('say')
import os from 'os'
import store from '../store'

export async function speak(text: string): Promise<string> {
  const isEnabled = store.get('voice', true)
  if (!isEnabled) {
    return 'Voice responses are currently disabled in user settings. The text was not spoken aloud.'
  }

  return new Promise((resolve) => {
    const cleanText = text.replace(/[*_`#]/g, '').trim()
    say.speak(cleanText, undefined, 1.0, (err: { message: any }) => {
      if (err) {
        resolve(`TTS error: ${err.message}`)
      } else {
        resolve(`Spoke: "${cleanText.slice(0, 80)}${cleanText.length > 80 ? '...' : ''}"`)
      }
    })
  })
}

export async function stopSpeaking(): Promise<void> {
  return new Promise((resolve) => {
    say.stop()
    resolve()
  })
}

export function getVoices(): string[] {
  return []
}
