import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyState } from './services/localStorageService'
import { storage } from './services/storage'

export function useStore({ onError } = {}) {
  const [data, setData] = useState(() => emptyState(storage.mode === 'local'))
  const [loading, setLoading] = useState(storage.mode === 'supabase')
  const [error, setError] = useState('')
  const snapshot = useRef(data)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    if (storage.mode === 'supabase' && !storage.session()) { setLoading(false); return undefined }
    let active = true
    storage.load().then(next => { if (active) { snapshot.current = next; setData(next) } })
      .catch(error => { if (active) { const message = error.message || 'Не удалось загрузить данные.'; setError(message); onErrorRef.current?.(message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try { const next = await storage.load(); snapshot.current = next; setData(next); setError('') }
    catch (reason) { setError(reason.message || 'Не удалось загрузить данные.') }
    finally { setLoading(false) }
  }, [])

  const update = useCallback(fn => {
    setData(previous => {
      const next = fn(previous); const before = snapshot.current
      snapshot.current = next
      Promise.resolve(storage.save(next, before)).catch(error => onErrorRef.current?.(`Не удалось сохранить изменения: ${error.message || 'проверьте подключение.'}`))
      return next
    })
  }, [])

  return { data, update, loading, error, mode: storage.mode, status: storage.status, reload }
}
