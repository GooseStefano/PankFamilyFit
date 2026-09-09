import { INITIAL_FOODS, INITIAL_GOALS, INITIAL_WEIGHT_ENTRIES } from '../data'

export const STORAGE_KEY = 'pank-family-fit-v01'
const SESSION_KEY = 'pff-session'
const DEV_PIN_HASHES = {
  danya: 'e95995d6e3f243779d317d32627e4a97c03ee94d95b9b91567133cb249d97b5c',
  vika: 'db49d04d733d3da455dff99d7f3e07b766043ef16056f24768bf719fa6f8c394',
}

export const emptyState = (withDemo = false) => ({
  foods: withDemo ? INITIAL_FOODS : [], goals: withDemo ? INITIAL_GOALS : [], entries: [], notes: {},
  weightEntries: withDemo ? INITIAL_WEIGHT_ENTRIES : [], recipeIngredients: [], workoutSessions: [],
  exerciseLibrary: [], workoutExercises: [], workoutSets: [], messagePhrases: [], dailyPhraseShows: [], directMessages: [],
})

const read = () => {
  try { return { ...emptyState(true), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } }
  catch { return emptyState(true) }
}

const sha256 = async value => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export const localStorageService = {
  mode: 'local',
  status: 'Локальный режим',
  async load() { return read() },
  async save(next) { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) },
  async login(pin) {
    const hash = await sha256(pin)
    const id = Object.entries(DEV_PIN_HASHES).find(([, pinHash]) => pinHash === hash)?.[0]
    if (!id) throw new Error('Неверный PIN. Попробуйте ещё раз.')
    const marker = { id, mode: 'local' }
    localStorage.setItem(SESSION_KEY, JSON.stringify(marker))
    return marker
  },
  session() {
    try { const marker = JSON.parse(localStorage.getItem(SESSION_KEY)); return marker?.mode === 'local' ? marker : null } catch { return null }
  },
  logout() { localStorage.removeItem(SESSION_KEY) },
}
