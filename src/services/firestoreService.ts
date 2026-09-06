import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Startup, StartupUpdate } from '../types'

const startupsRef = (uid: string) => collection(db, 'users', uid, 'startups')

export async function listStartups(uid: string): Promise<Startup[]> {
  const result = await getDocs(query(startupsRef(uid), orderBy('updatedAt', 'desc')))
  return result.docs.map((item) => ({ ...item.data(), id: item.id } as Startup))
}

export async function getStartup(uid: string, id: string): Promise<Startup> {
  const result = await getDoc(doc(db, 'users', uid, 'startups', id))
  if (!result.exists()) throw new Error('Startup not found')
  return { ...result.data(), id: result.id } as Startup
}

export async function createStartup(uid: string, startup: Omit<Startup, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const result = await addDoc(startupsRef(uid), { ...startup, ownerId: uid, createdAt: now, updatedAt: now })
  return result.id
}

export async function saveStartup(uid: string, id: string, update: StartupUpdate) {
  await updateDoc(doc(db, 'users', uid, 'startups', id), { ...update, updatedAt: new Date().toISOString(), serverUpdatedAt: serverTimestamp() })
}

export const removeStartup = (uid: string, id: string) => deleteDoc(doc(db, 'users', uid, 'startups', id))

export async function duplicateDemo(uid: string, startup: Omit<Startup, 'id' | 'ownerId'>) {
  const result = await doc(startupsRef(uid))
  await setDoc(result, { ...startup, ownerId: uid, isDemo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  return result.id
}
