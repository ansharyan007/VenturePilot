import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAtzW18qv66VNDcfiraIC2V1ys80FbsRoI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'venturepilot-cf134.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'venturepilot-cf134',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'venturepilot-cf134.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '306995182098',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:306995182098:web:2460a237bf8372d7a2b6cb',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
