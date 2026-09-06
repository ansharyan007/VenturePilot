import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStartup, saveStartup } from '../services/firestoreService'
import type { Startup, StartupUpdate } from '../types'

export function useStartup() {
  const { startupId = '' } = useParams()
  const { user } = useAuth()
  const [startup, setStartup] = useState<Startup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (!user || !startupId) return
    setLoading(true); setError('')
    try { setStartup(await getStartup(user.uid, startupId)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load startup') } finally { setLoading(false) }
  }, [startupId, user])
  useEffect(() => { void refresh() }, [refresh])
  const save = async (update: StartupUpdate) => {
    if (!user || !startup) return
    await saveStartup(user.uid, startup.id, update)
    setStartup((current) => current ? { ...current, ...update, updatedAt: new Date().toISOString() } : current)
  }
  return { startup, setStartup, loading, error, save, refresh }
}
