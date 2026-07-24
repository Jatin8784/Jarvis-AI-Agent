import React, { useState, useEffect, useRef } from 'react'

interface ModelOption {
  id: string
  name: string
  provider: string
  description?: string
}

const MODEL_OPTIONS: ModelOption[] = [
  // Groq
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', description: 'Fast & capable' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', description: 'Ultra fast' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', description: 'Good balance' },
  // DeepSeek
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', description: 'Strong reasoning' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek', description: 'Deep thinking' },
  // Ollama Cloud
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'ollama', description: 'Latest DeepSeek' },
  { id: 'gpt-oss:120b-cloud', name: 'GPT-OSS 120B', provider: 'ollama', description: 'OpenAI open weight' },
  { id: 'qwen3-coder:480b-cloud', name: 'Qwen3 Coder 480B', provider: 'ollama', description: 'Code specialist' },
  // Gemini
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', description: 'Fast multimodal' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', description: 'Advanced reasoning' },
  // Claude
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude', description: 'Balanced' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'claude', description: 'Most capable' },
  // MiniMax
  { id: 'MiniMax-M3', name: 'MiniMax M3', provider: 'minimax', description: 'Large MoE' },
  // Puter
  { id: 'gpt-5.4', name: 'GPT 5.4', provider: 'puter', description: 'Via Puter.js' },
]

const PROVIDER_COLORS: Record<string, string> = {
  groq: '#f97316',
  deepseek: '#3b82f6',
  ollama: '#8b5cf6',
  gemini: '#10b981',
  claude: '#ec4899',
  minimax: '#eab308',
  puter: '#06b6d4',
}

export function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState('llama-3.3-70b-versatile')
  const [currentProvider, setCurrentProvider] = useState('groq')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load current settings
  useEffect(() => {
    const load = async () => {
      const settings = await (window as any).jarvis?.getSettings()
      if (settings) {
        setCurrentModel(settings.model || 'llama-3.3-70b-versatile')
        setCurrentProvider(settings.provider || 'groq')
      }
    }
    load()

    // Listen for settings updates
    const handler = () => load()
    window.addEventListener('jarvis-settings-updated', handler)
    return () => window.removeEventListener('jarvis-settings-updated', handler)
  }, [])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selectModel = async (model: ModelOption) => {
    setCurrentModel(model.id)
    setCurrentProvider(model.provider)
    setIsOpen(false)

    // Save to settings
    await (window as any).jarvis?.setSettings({
      model: model.id,
      provider: model.provider,
    })
    window.dispatchEvent(new Event('jarvis-settings-updated'))
  }

  const currentOption = MODEL_OPTIONS.find(m => m.id === currentModel)
  const displayName = currentOption?.name || currentModel
  const providerColor = PROVIDER_COLORS[currentProvider] || '#00d4ff'

  // Group models by provider
  const groupedModels = MODEL_OPTIONS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = []
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, ModelOption[]>)

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 rounded border border-jarvis-border hover:border-jarvis-accent/40 transition-colors text-sm"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: providerColor }}
        />
        <span className="text-jarvis-text font-medium">{displayName}</span>
        <svg
          width="10" height="10" viewBox="0 0 16 16" fill="none"
          className={`text-jarvis-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-64 max-h-80 overflow-y-auto rounded-lg border border-jarvis-border bg-jarvis-panel shadow-glow-sm z-50">
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <div className="px-3 py-1.5 text-[10px] font-display tracking-wider text-jarvis-muted uppercase border-b border-jarvis-border/50 flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: PROVIDER_COLORS[provider] || '#888' }}
                />
                {provider}
              </div>
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => selectModel(model)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-jarvis-accent/5 transition-colors
                    ${model.id === currentModel ? 'bg-jarvis-accent/10 border-l-2 border-jarvis-accent' : ''}`}
                >
                  <div>
                    <div className="text-xs text-jarvis-text">{model.name}</div>
                    {model.description && (
                      <div className="text-[10px] text-jarvis-muted">{model.description}</div>
                    )}
                  </div>
                  {model.id === currentModel && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent flex-shrink-0">
                      <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}

          <div className="px-3 py-2 border-t border-jarvis-border">
            <p className="text-[10px] text-jarvis-muted">
              Or type a custom model in Settings
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
