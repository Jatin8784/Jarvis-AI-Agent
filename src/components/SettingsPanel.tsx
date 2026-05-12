import React, { useState, useEffect } from 'react'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    provider: 'groq',
    geminiKey: '',
    groqKey: '',
    claudeKey: '',
    deepseekKey: '',
    model: 'llama-3.3-70b-versatile',
    voice: true,
    runOnStartup: true,
    wakeWord: true,
    systemPrompt: '',
  })
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    groq: false,
    claude: false,
    deepseek: false,
  })

  useEffect(() => {
    if (open) {
      (window as any).jarvis?.getSettings?.().then((s: any) => {
        if (s) setSettings(s)
      })
    }
  }, [open])

  // Auto-switch model when provider changes
  const handleProviderChange = (newProvider: string) => {
    const defaultModels = {
      puter: 'gpt-5.4',
      deepseek: 'deepseek-chat',
      gemini: 'gemini-2.5-flash',
      groq: 'llama-3.3-70b-versatile',
      claude: 'claude-3-5-sonnet-20241022'
    }
    
    setSettings(s => ({
      ...s,
      provider: newProvider,
      model: defaultModels[newProvider as keyof typeof defaultModels] || s.model
    }))
  }

  const save = async () => {
    await (window as any).jarvis?.setSettings(settings)
    window.dispatchEvent(new Event('jarvis-settings-updated'))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(5, 8, 16, 0.85)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded border border-jarvis-border bg-jarvis-panel p-6"
           style={{ boxShadow: '0 0 40px rgba(0,212,255,0.1)' }}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-jarvis-accent tracking-widest text-sm">SETTINGS</h2>
          <button onClick={onClose} className="text-jarvis-muted hover:text-jarvis-accent text-xl transition-colors">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">
              AI PROVIDER
            </label>
            <select
              value={settings.provider}
              onChange={e => handleProviderChange(e.target.value)}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm outline-none"
            >
              <option value="puter">Puter.js (100% FREE & Unlimited - User Pays)</option>
              <option value="deepseek">DeepSeek (Requires Credits)</option>
              <option value="claude">Claude (Best Quality - $5 free)</option>
              <option value="groq">Groq (Unstable)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          {settings.provider === 'puter' ? (
            <>
              <div className="bg-jarvis-accent/10 border border-jarvis-accent/30 rounded p-4">
                <p className="text-jarvis-accent text-sm font-semibold mb-2">✨ 100% FREE & Unlimited!</p>
                <p className="text-jarvis-text text-xs mb-2">
                  Puter.js uses the "User-Pays" model - users authenticate with their Puter account and cover their own AI costs.
                </p>
                <p className="text-jarvis-muted text-xs mb-2">
                  • No API key needed<br/>
                  • Unlimited usage<br/>
                  • Access to GPT-5.4, Claude, Gemini & more<br/>
                  • Users sign in once with Puter account
                </p>
                <p className="text-jarvis-muted text-xs">
                  First time users will be prompted to sign in at{' '}
                  <span className="text-jarvis-accent">puter.com</span>
                </p>
              </div>

              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">MODEL</label>
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm outline-none"
                >
                  <option value="gpt-5.4">GPT-5.4 (recommended)</option>
                  <option value="gpt-5.3-chat">GPT-5.3 Chat</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>
            </>
          ) : settings.provider === 'deepseek' ? (
            <>
              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">
                  DEEPSEEK API KEY
                </label>
                <div className="relative">
                  <input
                    type={showKeys.deepseek ? "text" : "password"}
                    value={settings.deepseekKey}
                    onChange={e => setSettings(s => ({ ...s, deepseekKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 pr-10 text-jarvis-text text-sm
                               outline-none focus:border-jarvis-accent/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(s => ({ ...s, deepseek: !s.deepseek }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-jarvis-muted hover:text-jarvis-accent transition-colors p-1"
                    title={showKeys.deepseek ? "Hide" : "Show"}
                  >
                    {showKeys.deepseek ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-jarvis-muted text-xs mt-1">
                  Get FREE key at{' '}
                  <span className="text-jarvis-accent">platform.deepseek.com</span>
                  {' '}(Unlimited & Free Forever!)
                </p>
              </div>

              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">MODEL</label>
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm outline-none"
                >
                  <option value="deepseek-chat">DeepSeek Chat (recommended)</option>
                </select>
              </div>
            </>
          ) : settings.provider === 'gemini' ? (
            <>
              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">
                  GEMINI API KEY
                </label>
                <div className="relative">
                  <input
                    type={showKeys.gemini ? "text" : "password"}
                    value={settings.geminiKey}
                    onChange={e => setSettings(s => ({ ...s, geminiKey: e.target.value }))}
                    placeholder="AIza..."
                    className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 pr-10 text-jarvis-text text-sm
                               outline-none focus:border-jarvis-accent/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(s => ({ ...s, gemini: !s.gemini }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-jarvis-muted hover:text-jarvis-accent transition-colors p-1"
                    title={showKeys.gemini ? "Hide" : "Show"}
                  >
                    {showKeys.gemini ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-jarvis-muted text-xs mt-1">
                  Get free key at{' '}
                  <span className="text-jarvis-accent">aistudio.google.com</span>
                </p>
              </div>

              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">MODEL</label>
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm outline-none"
                >
                  <optgroup label="Gemini 2.5 (Recommended - 2026 Models)">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (recommended, fast & intelligent)</option>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (ultra fast, budget-friendly)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (most advanced, complex tasks)</option>
                  </optgroup>
                  <optgroup label="Gemini 3.x (Preview - Experimental)">
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (frontier-class performance)</option>
                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview (high-volume)</option>
                  </optgroup>
                  <optgroup label="Legacy (Deprecated - Auto-migrated)">
                    <option value="gemini-2.0-flash-thinking-exp-1219">Gemini 2.0 Flash Thinking (deprecated)</option>
                  </optgroup>
                </select>
                <p className="text-jarvis-muted text-xs mt-1">
                  💡 Use Gemini 2.5 Flash for best compatibility. Legacy models auto-migrate to 2.5 series.
                </p>
              </div>
            </>
          ) : settings.provider === 'claude' ? (
            <>
              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">
                  CLAUDE API KEY
                </label>
                <div className="relative">
                  <input
                    type={showKeys.claude ? "text" : "password"}
                    value={settings.claudeKey}
                    onChange={e => setSettings(s => ({ ...s, claudeKey: e.target.value }))}
                    placeholder="sk-ant-..."
                    className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 pr-10 text-jarvis-text text-sm
                               outline-none focus:border-jarvis-accent/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(s => ({ ...s, claude: !s.claude }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-jarvis-muted hover:text-jarvis-accent transition-colors p-1"
                    title={showKeys.claude ? "Hide" : "Show"}
                  >
                    {showKeys.claude ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-jarvis-muted text-xs mt-1">
                  Get key at{' '}
                  <span className="text-jarvis-accent">console.anthropic.com</span>
                  {' '}($5 free credits)
                </p>
              </div>

              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">MODEL</label>
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm outline-none"
                >
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (recommended)</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (faster)</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus (most capable)</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">
                  GROQ API KEY
                </label>
                <div className="relative">
                  <input
                    type={showKeys.groq ? "text" : "password"}
                    value={settings.groqKey}
                    onChange={e => setSettings(s => ({ ...s, groqKey: e.target.value }))}
                    placeholder="gsk_..."
                    className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 pr-10 text-jarvis-text text-sm
                               outline-none focus:border-jarvis-accent/50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(s => ({ ...s, groq: !s.groq }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-jarvis-muted hover:text-jarvis-accent transition-colors p-1"
                    title={showKeys.groq ? "Hide" : "Show"}
                  >
                    {showKeys.groq ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-jarvis-muted text-xs mt-1">
                  Get free key at{' '}
                  <span className="text-jarvis-accent">console.groq.com</span>
                  {' '}(30 req/min, 14,400/day)
                </p>
              </div>

              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">MODEL</label>
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm outline-none"
                >
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B (recommended)</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B (fastest)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  <option value="gemma2-9b-it">Gemma 2 9B</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">
              CUSTOM SYSTEM PROMPT (optional)
            </label>
            <textarea
              value={settings.systemPrompt}
              onChange={e => setSettings(s => ({ ...s, systemPrompt: e.target.value }))}
              placeholder="Additional instructions for JARVIS…"
              rows={3}
              className="w-full bg-jarvis-bg border border-jarvis-border rounded px-3 py-2 text-jarvis-text text-sm
                         outline-none focus:border-jarvis-accent/50 resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-jarvis-text text-sm">Voice responses</p>
              <p className="text-jarvis-muted text-xs">Speak answers aloud using system TTS</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, voice: !s.voice }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.voice ? 'bg-jarvis-accent' : 'bg-jarvis-border'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.voice ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-jarvis-text text-sm">Run on startup</p>
              <p className="text-jarvis-muted text-xs">Start JARVIS automatically when Windows starts</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, runOnStartup: !s.runOnStartup }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.runOnStartup ? 'bg-jarvis-accent' : 'bg-jarvis-border'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.runOnStartup ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-jarvis-text text-sm">Voice Activation (Beta)</p>
              <p className="text-jarvis-muted text-xs">Listen for "Jarvis" in the background to open</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, wakeWord: !s.wakeWord }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.wakeWord ? 'bg-jarvis-accent' : 'bg-jarvis-border'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.wakeWord ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 rounded border border-jarvis-border text-jarvis-muted text-sm hover:text-jarvis-text transition-colors font-display tracking-wider">
            CANCEL
          </button>
          <button onClick={save}
            className="flex-1 py-2 rounded border border-jarvis-accent/40 text-jarvis-accent text-sm hover:bg-jarvis-accent/10 transition-colors font-display tracking-wider">
            {saved ? '✓ SAVED' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  )
}
