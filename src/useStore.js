import { useCallback, useEffect, useRef, useState } from 'react'
import { cacheState, emptyState } from './services/localStorageService'
import { storage } from './services/storage'

const failure = reason => {
  const text = String(reason?.message || reason || '')
  if (/401|403|permission|jwt|auth/i.test(text)) return { state: 'permission-error', title: 'Ошибка прав доступа', message: 'Проверьте PIN и войдите снова.' }
  return { state: 'connection-error', title: 'Ошибка подключения', message: 'Не удалось связаться с Supabase. Проверьте интернет и повторите попытку.' }
}
const statusText = state => ({ local: 'Локальный режим', connecting: 'Подключение к Supabase…', active: 'Синхронизация активна', 'connection-error': 'Ошибка подключения', 'permission-error': 'Ошибка прав доступа' }[state])

export function useStore({ onError } = {}) {
  const [data, setData] = useState(() => emptyState(storage.mode === 'local'))
  const [loading, setLoading] = useState(storage.mode === 'supabase')
  const [error, setError] = useState('')
  const [syncState, setSyncState] = useState(storage.mode === 'local' ? 'local' : 'connecting')
  const [errorTitle, setErrorTitle] = useState('')
  const snapshot = useRef(data)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    if (storage.mode === 'supabase' && !storage.session()) { setLoading(false); setSyncState('connecting'); return undefined }
    let active = true
    storage.load().then(next => { if (active) { snapshot.current = next; cacheState(next); setData(next); setSyncState(storage.mode === 'local' ? 'local' : 'active'); setError('') } })
      .catch(reason => { if (active) { const next = failure(reason); setSyncState(next.state); setErrorTitle(next.title); setError(next.message); onErrorRef.current?.(next.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true); setSyncState('connecting')
    try { const next = await storage.load(); snapshot.current = next; cacheState(next); setData(next); setSyncState(storage.mode === 'local' ? 'local' : 'active'); setError('') }
    catch (reason) { const next = failure(reason); setSyncState(next.state); setErrorTitle(next.title); setError(next.message) }
    finally { setLoading(false) }
  }, [])

  const update = useCallback(fn => {
    setData(previous => {
      const next = fn(previous); const before = snapshot.current
      snapshot.current = next; cacheState(next)
      Promise.resolve(storage.save(next, before)).then(() => { if (storage.mode === 'supabase') setSyncState('active') }).catch(reason => { const problem = failure(reason); setSyncState(problem.state); setErrorTitle(problem.title); setError(problem.message); onErrorRef.current?.(problem.message) })
      return next
    })
  }, [])

  return { data, update, loading, error, errorTitle, mode: storage.mode, status: statusText(syncState), syncState, reload }
}
