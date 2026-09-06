import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

export async function register(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName: name })
  await setDoc(doc(db, 'users', credential.user.uid), { id: credential.user.uid, name, email, createdAt: new Date().toISOString() })
  return credential.user
}
export const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password)
export const logout = () => signOut(auth)

export function friendlyAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('invalid-credential')) return 'The email or password is incorrect.'
  if (code.includes('email-already-in-use')) return 'An account already exists for this email.'
  if (code.includes('weak-password')) return 'Use a password with at least 6 characters.'
  if (code.includes('configuration-not-found') || code.includes('operation-not-allowed')) return 'Email/password authentication is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.'
  if (code.includes('invalid-api-key')) return 'The Firebase web API key is invalid. Check the project configuration in .env.local.'
  if (code.includes('unauthorized-domain')) return 'This domain is not authorized in Firebase Authentication settings.'
  if (code.includes('permission-denied')) return 'Your account was created, but Firestore rejected the profile write. Create the Firestore database and deploy firestore.rules.'
  if (code.includes('network-request-failed')) return 'Network unavailable. Check your connection and try again.'
  return 'We could not complete that request. Please try again.'
}
