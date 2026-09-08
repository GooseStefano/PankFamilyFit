import { useCallback, useState } from 'react'
import { INITIAL_FOODS, INITIAL_GOALS, INITIAL_WEIGHT_ENTRIES } from './data'

const KEY = 'pank-family-fit-v01'
const empty = { foods: INITIAL_FOODS, goals: INITIAL_GOALS, entries: [], notes: {}, weightEntries: INITIAL_WEIGHT_ENTRIES }
const read = () => { try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY)) } } catch { return empty } }

export function useStore() {
  const [data, setData] = useState(read)
  const update = useCallback((fn) => setData(prev => { const next = fn(prev); localStorage.setItem(KEY, JSON.stringify(next)); return next }), [])
  return { data, update }
}
