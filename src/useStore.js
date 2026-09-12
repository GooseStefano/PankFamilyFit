import { useCallback, useEffect, useRef, useState } from 'react'
import { cacheState, cacheSupabaseSnapshot, emptyState, hasSupabaseSnapshot, readSupabaseSnapshot } from './services/localStorageService'
import { storage } from './services/storage'

const failure = reason => {
  const text = String(reason?.message || reason || '')
  if (/401|403|permission|jwt|auth/i.test(text)) return { state: 'permission-error', title: 'Ошибка прав доступа', message: 'Проверьте PIN и войдите снова.' }
  return { state: 'connection-error', title: 'Ошибка подключения', message: 'Не удалось связаться с Supabase. Проверьте интернет и повторите попытку.' }
}
const statusText = state => ({ local: 'Локальный режим', offline: 'Оффлайн · последний снимок', connecting: 'Подключение к Supabase…', active: 'Синхронизация активна', 'connection-error': 'Ошибка подключения', 'permission-error': 'Ошибка прав доступа' }[state])

export function useStore({ onError } = {}) {
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(() => storage.mode === 'supabase' && hasSupabaseSnapshot())
  const [data, setData] = useState(() => storage.mode === 'supabase' && hasSupabaseSnapshot() ? readSupabaseSnapshot() : emptyState(storage.mode === 'local'))
  const [loading, setLoading] = useState(storage.mode === 'supabase' && navigator.onLine)
  const [error, setError] = useState('')
  const [syncState, setSyncState] = useState(storage.mode === 'local' ? 'local' : navigator.onLine ? 'connecting' : 'offline')
  const [errorTitle, setErrorTitle] = useState('')
  const snapshot = useRef(data)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    if (storage.mode === 'supabase' && !navigator.onLine) { setLoading(false); setSyncState('offline'); return undefined }
    if (storage.mode === 'supabase' && !storage.session()) { setLoading(false); setSyncState('connecting'); return undefined }
    let active = true
    storage.load().then(next => { if (active) { snapshot.current = next; if (storage.mode === 'local') cacheState(next, storage.mode); else { cacheSupabaseSnapshot(next); setHasOfflineSnapshot(true); if (!storage.hasLocalMigration) cacheState(next, storage.mode) } setData(next); setSyncState(storage.mode === 'local' ? 'local' : 'active'); setError('') } })
      .catch(reason => { if (active) { const next = failure(reason); setSyncState(next.state); setErrorTitle(next.title); setError(next.message); onErrorRef.current?.(next.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const reload = useCallback(async () => {
    if (storage.mode === 'supabase' && !navigator.onLine) { setLoading(false); setSyncState('offline'); return }
    setLoading(true); setSyncState('connecting')
    try { const next = await storage.load(); snapshot.current = next; if (storage.mode === 'local') cacheState(next, storage.mode); else { cacheSupabaseSnapshot(next); setHasOfflineSnapshot(true); if (!storage.hasLocalMigration) cacheState(next, storage.mode) } setData(next); setSyncState(storage.mode === 'local' ? 'local' : 'active'); setError('') }
    catch (reason) { const next = failure(reason); setSyncState(next.state); setErrorTitle(next.title); setError(next.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (storage.mode !== 'supabase') return undefined
    const offline = () => { setLoading(false); setSyncState('offline'); setError(''); setErrorTitle('') }
    const online = () => reload()
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', online) }
  }, [reload])

  const update = useCallback(fn => {
    if (storage.mode === 'supabase' && !navigator.onLine) {
      setSyncState('offline')
      onErrorRef.current?.('Оффлайн: изменения заблокированы, локальный снимок не изменён.')
      return false
    }
    setData(previous => {
      const next = fn(previous); const before = snapshot.current
      snapshot.current = next; if (storage.mode === 'local' || !storage.hasLocalMigration) cacheState(next, storage.mode)
      Promise.resolve(storage.save(next, before)).then(() => { if (storage.mode === 'supabase') { cacheSupabaseSnapshot(next); setHasOfflineSnapshot(true); setSyncState('active') } }).catch(reason => { const problem = failure(reason); setSyncState(problem.state); setErrorTitle(problem.title); setError(problem.message); onErrorRef.current?.(problem.message) })
      return next
    })
    return true
  }, [])

  const migrateLocalData = useCallback(async () => {
    if (storage.mode !== 'supabase' || !storage.hasLocalMigration) return false
    setLoading(true); setSyncState('connecting')
    try {
      const next = await storage.migrateLocalData(snapshot.current)
      snapshot.current = next; cacheSupabaseSnapshot(next); setHasOfflineSnapshot(true); setData(next); setSyncState('active'); return true
    } catch (reason) {
      const problem = failure(reason); setSyncState(problem.state); setErrorTitle(problem.title); setError(problem.message); return false
    } finally { setLoading(false) }
  }, [])
  const dismissLocalMigration = useCallback(() => {
    storage.dismissLocalMigration?.()
    cacheState(snapshot.current, storage.mode)
  }, [])

  return { data, update, loading, error, errorTitle, mode: storage.mode, status: statusText(syncState), syncState, isOffline: syncState === 'offline', hasOfflineSnapshot, reload, hasLocalMigration: Boolean(storage.hasLocalMigration), migrateLocalData, dismissLocalMigration }
}
