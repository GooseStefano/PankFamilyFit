import { useCallback, useEffect, useState } from 'react'

const isOnline = () => navigator.onLine

export function usePwaUpdate() {
  const [registration, setRegistration] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [online, setOnline] = useState(isOnline)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined
    let active = true
    const inspect = next => {
      if (!active || !next) return
      setRegistration(next)
      setWaiting(Boolean(next.waiting))
    }
    const onRegistration = event => inspect(event.detail)
    const offline = () => setOnline(false)
    const check = () => navigator.serviceWorker.getRegistration().then(registration => {
      setOnline(isOnline())
      inspect(registration)
      if (isOnline()) registration?.update().catch(() => undefined)
    })
    window.addEventListener('pwa-registration', onRegistration)
    window.addEventListener('online', check)
    window.addEventListener('offline', offline)
    check()
    return () => { active = false; window.removeEventListener('pwa-registration', onRegistration); window.removeEventListener('online', check); window.removeEventListener('offline', offline) }
  }, [])

  const applyUpdate = useCallback(() => {
    if (!isOnline() || !registration?.waiting) return
    const reload = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [registration])

  return { updateAvailable: waiting && online, applyUpdate }
}
