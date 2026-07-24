import React, { useState, useRef } from 'react'
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  sendPhoneOTP,
  verifyPhoneOTP,
  setupRecaptcha,
} from '../services/firebase'

type AuthTab = 'login' | 'register'
type LoginMode = 'email' | 'phone' | 'email-otp'

export function AuthScreen() {
  const [tab, setTab] = useState<AuthTab>('login')
  const [loginMode, setLoginMode] = useState<LoginMode>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [success, setSuccess] = useState('')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Phone OTP state (used in login)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  // Email OTP state
  const [emailOtpAddress, setEmailOtpAddress] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  // Register OTP state
  const [regOtpSent, setRegOtpSent] = useState(false)
  const [regOtp, setRegOtp] = useState('')

  const recaptchaRef = useRef<HTMLDivElement>(null)

  const clearMessages = () => { setError(''); setSuccess('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      await loginWithEmail(loginEmail, loginPassword)
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const recaptchaVerifier = setupRecaptcha('recaptcha-container')
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
      await sendPhoneOTP(formattedPhone, recaptchaVerifier)
      setOtpSent(true)
      setSuccess('OTP sent to ' + formattedPhone)
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code) || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      await verifyPhoneOTP(otp)
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code) || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      console.log('[Auth] Sending email OTP to:', emailOtpAddress)
      const result = await (window as any).jarvis?.sendEmailOTP(emailOtpAddress)
      console.log('[Auth] Send OTP result:', result)
      if (result?.success) {
        setEmailOtpSent(true)
        setSuccess('OTP sent to ' + emailOtpAddress + '. Check your inbox.')
      } else {
        setError(result?.error || 'Failed to send OTP. Check your email address.')
      }
    } catch (err: any) {
      console.error('[Auth] Send OTP error:', err)
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const result = await (window as any).jarvis?.verifyEmailOTP(emailOtpAddress, emailOtp)
      if (result?.success) {
        // OTP verified — sign in or create account
        const otpPassword = `jarvis_otp_${emailOtpAddress.replace(/[^a-z0-9]/gi, '')}_secure`
        try {
          // Try to login (existing user)
          await loginWithEmail(emailOtpAddress, otpPassword)
        } catch (loginErr: any) {
          if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
            // New user — create account
            await registerWithEmail(emailOtpAddress, otpPassword, emailOtpAddress.split('@')[0])
          } else {
            throw loginErr
          }
        }
      } else {
        setError(result?.error || 'Invalid OTP')
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code) || err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    if (!regOtpSent) {
      // Step 1: Send OTP to email
      try {
        console.log('[Auth] Sending register OTP to:', regEmail)
        const result = await (window as any).jarvis?.sendEmailOTP(regEmail)
        console.log('[Auth] Register OTP result:', result)
        if (result?.success) {
          setRegOtpSent(true)
          setSuccess('OTP sent to ' + regEmail + '. Check your inbox.')
        } else {
          setError(result?.error || 'Failed to send OTP')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to send OTP')
      }
    } else {
      // Step 2: Verify OTP then create account
      try {
        const result = await (window as any).jarvis?.verifyEmailOTP(regEmail, regOtp)
        if (result?.success) {
          // OTP verified — create account
          await registerWithEmail(regEmail, regPassword, regName)
          setSuccess('Account created successfully!')
        } else {
          setError(result?.error || 'Invalid OTP')
        }
      } catch (err: any) {
        setError(getFirebaseErrorMessage(err.code) || err.message)
      }
    }

    setLoading(false)
  }

  const handleGoogle = async () => {
    clearMessages()
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code) || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-jarvis-bg">
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full border border-jarvis-accent/30 flex items-center justify-center mx-auto mb-4"
               style={{ boxShadow: '0 0 30px rgba(0,212,255,0.15)' }}>
            <div className="w-8 h-8 rounded-full border border-jarvis-accent/60 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-jarvis-accent animate-pulse-slow" />
            </div>
          </div>
          <h1 className="font-display text-jarvis-accent text-2xl tracking-widest mb-1">JARVIS</h1>
          <p className="text-jarvis-muted text-xs tracking-wider">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-jarvis-border mb-6">
          <button
            onClick={() => { setTab('login'); clearMessages(); setOtpSent(false) }}
            className={`flex-1 py-2.5 text-xs font-display tracking-wider transition-colors border-b-2 ${
              tab === 'login'
                ? 'text-jarvis-accent border-jarvis-accent'
                : 'text-jarvis-muted border-transparent hover:text-jarvis-text'
            }`}
          >
            LOGIN
          </button>
          <button
            onClick={() => { setTab('register'); clearMessages(); setOtpSent(false) }}
            className={`flex-1 py-2.5 text-xs font-display tracking-wider transition-colors border-b-2 ${
              tab === 'register'
                ? 'text-jarvis-accent border-jarvis-accent'
                : 'text-jarvis-muted border-transparent hover:text-jarvis-text'
            }`}
          >
            REGISTER
          </button>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded bg-red-900/20 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-3 py-2 rounded bg-green-900/20 border border-green-500/30 text-green-400 text-xs">
            {success}
          </div>
        )}

        {/* ===== LOGIN TAB ===== */}
        {tab === 'login' && (
          <div>
            {/* Toggle: Email / Email OTP / Phone */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setLoginMode('email'); clearMessages(); setOtpSent(false) }}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  loginMode === 'email'
                    ? 'border-jarvis-accent/40 bg-jarvis-accent/10 text-jarvis-accent'
                    : 'border-jarvis-border text-jarvis-muted hover:text-jarvis-text'
                }`}
              >
                Password
              </button>
              <button
                onClick={() => { setLoginMode('email-otp'); clearMessages(); setOtpSent(false) }}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  loginMode === 'email-otp'
                    ? 'border-jarvis-accent/40 bg-jarvis-accent/10 text-jarvis-accent'
                    : 'border-jarvis-border text-jarvis-muted hover:text-jarvis-text'
                }`}
              >
                Email OTP
              </button>
              <button
                onClick={() => { setLoginMode('phone'); clearMessages(); setOtpSent(false) }}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  loginMode === 'phone'
                    ? 'border-jarvis-accent/40 bg-jarvis-accent/10 text-jarvis-accent'
                    : 'border-jarvis-border text-jarvis-muted hover:text-jarvis-text'
                }`}
              >
                Phone
              </button>
            </div>

            {loginMode === 'email' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">EMAIL</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">PASSWORD</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded bg-jarvis-accent/20 border border-jarvis-accent/40 text-jarvis-accent text-sm font-display tracking-wider hover:bg-jarvis-accent/30 transition-colors disabled:opacity-50"
                >
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}
                </button>
              </form>
            ) : loginMode === 'email-otp' ? (
              /* Email OTP login */
              <div className="space-y-4">
                {!emailOtpSent ? (
                  <form onSubmit={handleSendEmailOTP} className="space-y-4">
                    <div>
                      <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">EMAIL</label>
                      <input
                        type="email"
                        value={emailOtpAddress}
                        onChange={e => setEmailOtpAddress(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50"
                      />
                      <p className="text-jarvis-muted text-xs mt-1">We'll send a 6-digit code to your email</p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded bg-jarvis-accent/20 border border-jarvis-accent/40 text-jarvis-accent text-sm font-display tracking-wider hover:bg-jarvis-accent/30 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'SENDING...' : 'SEND OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                    <div>
                      <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">ENTER OTP</label>
                      <input
                        type="text"
                        value={emailOtp}
                        onChange={e => setEmailOtp(e.target.value)}
                        placeholder="6-digit code"
                        maxLength={6}
                        required
                        className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 text-center tracking-[0.5em] text-lg"
                      />
                      <p className="text-jarvis-muted text-xs mt-1">Check your inbox for the code</p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded bg-jarvis-accent/20 border border-jarvis-accent/40 text-jarvis-accent text-sm font-display tracking-wider hover:bg-jarvis-accent/30 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'VERIFYING...' : 'VERIFY & LOGIN'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmailOtpSent(false); setEmailOtp('') }}
                      className="w-full py-2 text-jarvis-muted text-xs hover:text-jarvis-text transition-colors"
                    >
                      ← Change email
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Phone OTP login */
              <div className="space-y-4">
                {!otpSent ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div>
                      <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">PHONE NUMBER</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        required
                        className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50"
                      />
                      <p className="text-jarvis-muted text-xs mt-1">Include country code (e.g. +91 for India)</p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded bg-jarvis-accent/20 border border-jarvis-accent/40 text-jarvis-accent text-sm font-display tracking-wider hover:bg-jarvis-accent/30 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'SENDING OTP...' : 'SEND OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div>
                      <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">ENTER OTP</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="6-digit code"
                        maxLength={6}
                        required
                        className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 text-center tracking-[0.5em] text-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded bg-jarvis-accent/20 border border-jarvis-accent/40 text-jarvis-accent text-sm font-display tracking-wider hover:bg-jarvis-accent/30 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'VERIFYING...' : 'VERIFY OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp('') }}
                      className="w-full py-2 text-jarvis-muted text-xs hover:text-jarvis-text transition-colors"
                    >
                      ← Change number
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== REGISTER TAB ===== */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">FULL NAME</label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Your name"
                required
                disabled={regOtpSent}
                className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">EMAIL</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={regOtpSent}
                className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">PHONE</label>
              <input
                type="tel"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                placeholder="+91 9876543210"
                required
                disabled={regOtpSent}
                className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">PASSWORD</label>
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                disabled={regOtpSent}
                className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">CONFIRM PASSWORD</label>
              <input
                type="password"
                value={regConfirmPassword}
                onChange={e => setRegConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={regOtpSent}
                className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 disabled:opacity-50"
              />
            </div>

            {/* OTP input — shown after sending */}
            {regOtpSent && (
              <div>
                <label className="block text-jarvis-muted text-xs font-display tracking-wider mb-1.5">ENTER OTP (sent to {regEmail})</label>
                <input
                  type="text"
                  value={regOtp}
                  onChange={e => setRegOtp(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full bg-jarvis-panel border border-jarvis-border rounded px-3 py-2.5 text-jarvis-text text-sm outline-none focus:border-jarvis-accent/50 text-center tracking-[0.5em] text-lg"
                />
                <p className="text-jarvis-muted text-xs mt-1">Check your inbox & spam folder</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-jarvis-accent/20 border border-jarvis-accent/40 text-jarvis-accent text-sm font-display tracking-wider hover:bg-jarvis-accent/30 transition-colors disabled:opacity-50"
            >
              {loading ? (regOtpSent ? 'VERIFYING...' : 'SENDING OTP...') : (regOtpSent ? 'VERIFY & CREATE ACCOUNT' : 'SEND VERIFICATION OTP')}
            </button>

            {regOtpSent && (
              <button
                type="button"
                onClick={() => { setRegOtpSent(false); setRegOtp('') }}
                className="w-full py-2 text-jarvis-muted text-xs hover:text-jarvis-text transition-colors"
              >
                ← Edit details
              </button>
            )}
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-jarvis-border" />
          <span className="text-jarvis-muted text-xs">OR</span>
          <div className="flex-1 h-px bg-jarvis-border" />
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-2.5 rounded border border-jarvis-border text-jarvis-text text-sm flex items-center justify-center gap-3 hover:border-jarvis-accent/40 hover:bg-jarvis-panel transition-colors disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Recaptcha container (invisible) */}
        <div id="recaptcha-container" ref={recaptchaRef} />
      </div>
    </div>
  )
}

function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered. Try logging in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign in popup was closed.',
    'auth/invalid-phone-number': 'Invalid phone number format.',
    'auth/invalid-verification-code': 'Invalid OTP code.',
    'auth/code-expired': 'OTP has expired. Request a new one.',
  }
  return messages[code] || `Authentication error: ${code}`
}
