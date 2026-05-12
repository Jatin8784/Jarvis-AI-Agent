import React, { useEffect, useRef, useState } from 'react'

export function WakeWordListener() {
  const [enabled, setEnabled] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<any>(null)
  const enabledRef = useRef(false)
  const isProcessingRef = useRef(false)
  const checkLevelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  useEffect(() => {
    // Check if enabled in settings
    const checkSettings = async () => {
      const settings = await (window as any).jarvis?.getSettings()
      setEnabled(!!settings?.wakeWord)
    }
    checkSettings()
    
    const handleSettingsUpdate = () => { checkSettings() }
    window.addEventListener('jarvis-settings-updated', handleSettingsUpdate)

    // Poll as a fallback in case settings changed elsewhere
    const interval = setInterval(checkSettings, 5000)
    return () => {
      window.removeEventListener('jarvis-settings-updated', handleSettingsUpdate)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (enabled && !streamRef.current) {
      startListening()
    } else if (!enabled && streamRef.current) {
      stopListening()
    }

    return () => stopListening()
  }, [enabled])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const checkLevel = () => {
        if (!analyserRef.current || isProcessingRef.current || !enabledRef.current) {
          timerRef.current = requestAnimationFrame(checkLevel)
          return
        }
        
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength
        
        // If sound level is high enough, record a snippet
        if (average > 20) { // Lowered threshold for better detection (was 30)
          triggerDetection()
        } else {
          timerRef.current = requestAnimationFrame(checkLevel)
        }
      }

      checkLevelRef.current = checkLevel
      checkLevel()
    } catch (err) {
      console.error('Failed to start wake word listener:', err)
    }
  }

  const stopListening = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current)
    timerRef.current = null
    checkLevelRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const triggerDetection = async () => {
    if (isProcessing || !streamRef.current) return
    setIsProcessing(true)
    
    const mediaRecorder = new MediaRecorder(streamRef.current)
    const chunks: Blob[] = []
    
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType })
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1]
        try {
          const result = await (window as any).jarvis.checkWakeWord(base64, mediaRecorder.mimeType)
          if (result.success && result.detected) {
            console.log('🚀 Wake word "Jarvis" detected!')
            await (window as any).jarvis.show()
            // Optional: play a sound or speak
          }
        } catch (err) {
          console.error('Wake word check failed:', err)
        } finally {
          setIsProcessing(false)
          // Resume level checking after a short delay
          setTimeout(() => {
            if (enabledRef.current && checkLevelRef.current) {
              timerRef.current = requestAnimationFrame(checkLevelRef.current)
            }
          }, 1000)
        }
      }
    }
    
    mediaRecorder.start()
    // Record for 1.5 seconds
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') mediaRecorder.stop()
    }, 1500)
  }

  return null // Hidden component
}
