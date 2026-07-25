import https from 'https'

const BREVO_API_KEY = process.env.BREVO_API_KEY || ''
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'jatin.bhoraniya007@gmail.com'
const SENDER_NAME = 'JARVIS AI'

// Store OTPs in memory with expiry
const otpStore: Map<string, { code: string; expiresAt: number }> = new Map()

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function sendEmailOTP(email: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const otp = generateOTP()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    // Store OTP
    otpStore.set(email.toLowerCase(), { code: otp, expiresAt })

    const payload = JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email }],
      subject: 'Your JARVIS Login Code',
      htmlContent: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #0a0e1a; border: 1px solid #1a2a4a; border-radius: 12px;">
          <h2 style="color: #00d4ff; text-align: center; margin-bottom: 20px; letter-spacing: 3px;">JARVIS</h2>
          <p style="color: #c8e6ff; text-align: center; margin-bottom: 20px;">Your verification code is:</p>
          <div style="background: #050810; border: 1px solid #00d4ff40; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 32px; letter-spacing: 8px; color: #00d4ff; font-weight: bold;">${otp}</span>
          </div>
          <p style="color: #4a7090; text-align: center; font-size: 12px;">This code expires in 5 minutes.</p>
          <p style="color: #4a7090; text-align: center; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    })

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
    }

    console.log('📧 Sending OTP email via Brevo to:', email, '(key starts with:', BREVO_API_KEY.substring(0, 12) + '...)')

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log('📧 Brevo response:', res.statusCode, data)
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ OTP sent to ${email}`)
          resolve({ success: true })
        } else {
          console.error(`❌ Brevo error: ${res.statusCode} ${data}`)
          resolve({ success: false, error: `Failed to send email (${res.statusCode}): ${data}` })
        }
      })
    })

    req.on('error', (err) => {
      console.error('❌ Brevo request error:', err)
      resolve({ success: false, error: err.message })
    })

    req.write(payload)
    req.end()
  })
}

export function verifyEmailOTP(email: string, code: string): { success: boolean; error?: string } {
  const stored = otpStore.get(email.toLowerCase())

  if (!stored) {
    return { success: false, error: 'No OTP found. Please request a new one.' }
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase())
    return { success: false, error: 'OTP expired. Please request a new one.' }
  }

  if (stored.code !== code) {
    return { success: false, error: 'Invalid OTP code.' }
  }

  // Valid — remove from store
  otpStore.delete(email.toLowerCase())
  return { success: true }
}