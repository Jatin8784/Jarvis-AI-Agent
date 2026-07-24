import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  type ConfirmationResult,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyC3Vu6F8s4vGT1FRKhII6VYnfQUKRgUbKc",
  authDomain: "jarvis-491fb.firebaseapp.com",
  projectId: "jarvis-491fb",
  storageBucket: "jarvis-491fb.firebasestorage.app",
  messagingSenderId: "555872484780",
  appId: "1:555872484780:web:fba6b2484338d107254e09",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

const googleProvider = new GoogleAuthProvider()

// --- Auth Functions ---

export async function registerWithEmail(email: string, password: string, displayName: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(result.user, { displayName })
  // Don't send Firebase verification email — we use our own Brevo OTP
  return result.user
}

export async function loginWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

// Phone OTP
let confirmationResult: ConfirmationResult | null = null

export function setupRecaptcha(containerId: string) {
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  })
  return verifier
}

export async function sendPhoneOTP(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) {
  confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
  return confirmationResult
}

export async function verifyPhoneOTP(otp: string) {
  if (!confirmationResult) throw new Error('No OTP request in progress')
  const result = await confirmationResult.confirm(otp)
  return result.user
}

export async function logout() {
  await signOut(auth)
  // Force clear any cached state
  console.log('🔓 User signed out')
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export type { User }
