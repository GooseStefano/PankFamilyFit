import { createClient } from '@supabase/supabase-js'
import { emptyState } from './localStorageService'

const SESSION_KEY = 'pff-session'
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const configured = Boolean(url && anonKey)
let marker = null
let client = null

const camel = value => value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
const snake = value => value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
const keys = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [snake(key), item]))
const withDates = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [camel(key), item]))
const setClient = token => { client = createClient(url, anonKey, { global: token ? { headers: { Authorization: `Bearer ${token}` } } : {} }) }
if (configured) setClient()

const userId = value => ({
  '00000000-0000-0000-0000-000000000001': 'danya',
  '00000000-0000-0000-0000-000000000002': 'vika',
}[value] || value)
const dbUserId = value => ({
  danya: '00000000-0000-0000-0000-000000000001',
  vika: '00000000-0000-0000-0000-000000000002',
}[value] || value)

const mapRow = (row, relation = {}) => {
  const value = withDates(row)
  Object.entries(relation).forEach(([key, mapper]) => { if (value[key]) value[key] = mapper(value[key]) })
  return value
}
const dbRow = (row, relation = {}) => {
  const value = { ...row }
  Object.entries(relation).forEach(([key, mapper]) => { if (value[key]) value[key] = mapper(value[key]) })
  return keys(value)
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const changed = (nextRows, previousRows) => {
  const before = new Map(previousRows.map(row => [row.id, row]))
  return nextRows.filter(row => !same(row, before.get(row.id)))
}

const tables = [
  ['nutrition_goals', 'goals', { userId: dbUserId }, false], ['food_items', 'foods', { createdBy: dbUserId }, true], ['meal_entries', 'entries', { userId: dbUserId }, true],
  ['weight_entries', 'weightEntries', { userId: dbUserId }, true], ['recipe_ingredients', 'recipeIngredients', {}, false],
  ['workout_sessions', 'workoutSessions', { userId: dbUserId }, true], ['exercise_library', 'exerciseLibrary', {}, true],
  ['workout_exercises', 'workoutExercises', {}, true], ['workout_sets', 'workoutSets', {}, true],
  ['message_phrases', 'messagePhrases', { createdBy: dbUserId, targetUserId: dbUserId }, true],
  ['daily_phrase_shows', 'dailyPhraseShows', { targetUserId: dbUserId }, false], ['direct_messages', 'directMessages', { fromUserId: dbUserId, toUserId: dbUserId }, true],
]

const toUi = (key, row) => {
  const value = mapRow(row)
  if (key === 'foods') return { ...value, favorite: value.isFavorite, archived: value.isArchived, measures: [] }
  return value
}
const toDb = (key, row, relations, hasUpdatedAt, timestamp) => {
  const value = { ...row }
  if (key === 'foods') { value.isFavorite = value.favorite; value.isArchived = value.archived; delete value.favorite; delete value.archived; delete value.measures }
  if (hasUpdatedAt) value.updatedAt = value.updatedAt || timestamp
  else delete value.updatedAt
  return dbRow(value, relations)
}

const ensure = () => { if (!configured) throw new Error('Supabase не настроен.'); if (!client || !marker?.token) throw new Error('Сеанс синхронизации истёк. Войдите снова.') }

export const supabaseService = {
  mode: 'supabase',
  get status() { return 'Синхронизация Supabase' },
  configured,
  session() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY))
      if (saved?.mode === 'supabase' && saved.token && Number(saved.expiresAt || 0) > Date.now()) { marker = saved; setClient(saved.token); return saved }
    } catch { /* ignored */ }
    return null
  },
  async login(pin) {
    if (!configured) throw new Error('Supabase не настроен.')
    const { data, error } = await client.functions.invoke('pin-login', { body: { pin } })
    const token = data?.access_token || data?.token
    if (error || !token || !data?.user?.id) throw new Error(data?.error || error?.message || 'Не удалось выполнить вход.')
    marker = { ...data.user, token, expiresAt: data.expiresAt, mode: 'supabase' }
    localStorage.setItem(SESSION_KEY, JSON.stringify(marker)); setClient(marker.token)
    return marker
  },
  logout() { marker = null; localStorage.removeItem(SESSION_KEY); if (configured) setClient() },
  async load() {
    ensure()
    const requests = [...tables.map(([table]) => client.from(table).select('*')), client.from('food_measures').select('*'), client.from('daily_notes').select('*')]
    const results = await Promise.all(requests)
    const failed = results.find(result => result.error)
    if (failed) throw failed.error
    const state = emptyState(false)
    tables.forEach(([, key, relations], index) => {
      state[key] = results[index].data.map(row => {
        const mapped = toUi(key, row)
        Object.keys(relations || {}).forEach(field => { if (mapped[field]) mapped[field] = userId(mapped[field]) })
        return mapped
      })
    })
    const measures = results[tables.length].data.map(row => mapRow(row))
    state.foods = state.foods.map(food => ({ ...food, measures: measures.filter(measure => measure.foodItemId === food.id).map(({ foodItemId, ...measure }) => measure) }))
    state.notes = Object.fromEntries(results[tables.length + 1].data.map(row => [mapRow(row).userId + ':' + row.date, row.text]))
    return state
  },
  async save(next, previous) {
    ensure()
    const timestamp = new Date().toISOString()
    const writes = []; const deletes = []
    for (const [table, key, relations, hasUpdatedAt] of tables) {
      const nextRows = next[key] || []; const oldRows = previous?.[key] || []; const oldIds = new Set(oldRows.map(row => row.id)); const nextIds = new Set(nextRows.map(row => row.id))
      const rows = changed(nextRows, oldRows).map(row => toDb(key, row, relations, hasUpdatedAt, timestamp))
      if (rows.length) writes.push([table, rows])
      const removed = [...oldIds].filter(id => !nextIds.has(id)); if (removed.length) deletes.push([table, removed])
    }
    // Parents are written before children: food → ingredients, session → exercise → set.
    for (const [table, rows] of writes) { const { error } = await client.from(table).upsert(rows); if (error) throw error }
    const nextMeasures = (next.foods || []).flatMap(food => (food.measures || []).map(measure => ({ ...measure, id: measure.id || crypto.randomUUID(), foodItemId: food.id })))
    const oldMeasures = (previous?.foods || []).flatMap(food => (food.measures || []).map(measure => ({ ...measure, foodItemId: food.id })))
    const changedMeasures = changed(nextMeasures, oldMeasures).map(row => keys(row)); if (changedMeasures.length) { const { error } = await client.from('food_measures').upsert(changedMeasures); if (error) throw error }
    const oldMeasureIds = new Set(oldMeasures.map(row => row.id)); const measureIds = new Set(nextMeasures.map(row => row.id)); const removedMeasures = [...oldMeasureIds].filter(id => !measureIds.has(id)); if (removedMeasures.length) { const { error } = await client.from('food_measures').delete().in('id', removedMeasures); if (error) throw error }
    const noteRows = Object.entries(next.notes || {}).filter(([key, text]) => previous?.notes?.[key] !== text).map(([key, text]) => { const [localUserId, date] = key.split(':'); return { user_id: dbUserId(localUserId), date, text, updated_at: timestamp } })
    if (noteRows.length) { const { error } = await client.from('daily_notes').upsert(noteRows, { onConflict: 'user_id,date' }); if (error) throw error }
    const oldNoteKeys = new Set(Object.keys(previous?.notes || {})); const noteKeys = new Set(Object.keys(next.notes || {})); const removedNotes = [...oldNoteKeys].filter(key => !noteKeys.has(key)).map(key => { const [localUserId, date] = key.split(':'); return { userId: dbUserId(localUserId), date } })
    for (const note of removedNotes) { const { error } = await client.from('daily_notes').delete().eq('user_id', note.userId).eq('date', note.date); if (error) throw error }
    // Delete children first, avoiding foreign-key races when an exercise/session is removed.
    for (const [table, ids] of deletes.reverse()) { const { error } = await client.from(table).delete().in('id', ids); if (error) throw error }
  },
}
