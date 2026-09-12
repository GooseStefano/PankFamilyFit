import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './components.css'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(registration => {
        const urls = [...document.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
          .map(element => new URL(element.src || element.href, window.location.origin))
          .filter(url => url.origin === window.location.origin && url.pathname.startsWith('/assets/'))
          .map(url => `${url.pathname}${url.search}`)
        registration.active?.postMessage({ type: 'CACHE_ASSETS', urls })
      })
      .catch(error => { console.warn('Не удалось зарегистрировать service worker:', error) })
  })
}
