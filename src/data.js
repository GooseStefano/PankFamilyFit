export const USERS = [
  { id: 'danya', name: 'Даня', role: 'admin', pinHash: 'e95995d6e3f243779d317d32627e4a97c03ee94d95b9b91567133cb249d97b5c' },
  { id: 'vika', name: 'Вика', role: 'member', pinHash: 'db49d04d733d3da455dff99d7f3e07b766043ef16056f24768bf719fa6f8c394' },
]

export const CATEGORIES = ['Все', 'Мясо', 'Рыба', 'Яйца', 'Молочка', 'Крупы', 'Макароны/хлеб', 'Овощи', 'Фрукты', 'Сладкое', 'Соусы', 'Масла', 'Напитки', 'Готовое', 'Другое']
export const MEALS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
export const UNIT_LABELS = { g: 'г', ml: 'мл', piece: 'штука', portion: 'порция', glass: 'стакан', tsp: 'ч. ложка', tbsp: 'ст. ложка' }

export const INITIAL_FOODS = [
  { id: 'egg', name: 'Яйцо куриное', type: 'product', category: 'Яйца', baseUnit: 'g', baseAmount: 100, calories: 157, protein: 12.7, fat: 11.5, carbs: 0.7, favorite: true, archived: false, usageCount: 12, measures: [{ unit: 'piece', label: '1 штука', amountInBase: 55 }] },
  { id: 'oats', name: 'Овсяные хлопья', type: 'product', category: 'Крупы', baseUnit: 'g', baseAmount: 100, calories: 352, protein: 12.3, fat: 6.1, carbs: 61.8, favorite: true, archived: false, usageCount: 9, measures: [] },
  { id: 'chicken', name: 'Куриная грудка', type: 'product', category: 'Мясо', baseUnit: 'g', baseAmount: 100, calories: 165, protein: 31, fat: 3.6, carbs: 0, favorite: true, archived: false, usageCount: 18, measures: [] },
  { id: 'rice', name: 'Рис варёный', type: 'product', category: 'Крупы', baseUnit: 'g', baseAmount: 100, calories: 130, protein: 2.7, fat: 0.3, carbs: 28, favorite: false, archived: false, usageCount: 7, measures: [{ unit: 'portion', label: '1 порция', amountInBase: 180 }] },
  { id: 'milk', name: 'Молоко 2,5%', type: 'product', category: 'Молочка', baseUnit: 'ml', baseAmount: 100, calories: 52, protein: 2.8, fat: 2.5, carbs: 4.7, favorite: false, archived: false, usageCount: 5, measures: [{ unit: 'glass', label: '1 стакан', amountInBase: 250 }] },
  { id: 'banana', name: 'Банан', type: 'product', category: 'Фрукты', baseUnit: 'g', baseAmount: 100, calories: 96, protein: 1.5, fat: 0.5, carbs: 21, favorite: false, archived: false, usageCount: 4, measures: [{ unit: 'piece', label: '1 штука', amountInBase: 120 }] },
]

export const INITIAL_GOALS = [
  { id: 'gd', userId: 'danya', startDate: '2026-09-08', calories: 2200, protein: 160, fat: 70, carbs: 230 },
  { id: 'gv', userId: 'vika', startDate: '2026-09-08', calories: 1600, protein: 110, fat: 50, carbs: 160 },
]

export const INITIAL_WEIGHT_ENTRIES = [
  { id: 'wd1', userId: 'danya', date: '2026-08-01', weight: 121.2, note: 'Старт', createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'wd2', userId: 'danya', date: '2026-08-09', weight: 120.4, note: '', createdAt: '2026-08-09T08:00:00.000Z', updatedAt: '2026-08-09T08:00:00.000Z' },
  { id: 'wd3', userId: 'danya', date: '2026-08-18', weight: 119.9, note: '', createdAt: '2026-08-18T08:00:00.000Z', updatedAt: '2026-08-18T08:00:00.000Z' },
  { id: 'wd4', userId: 'danya', date: '2026-08-27', weight: 119.2, note: 'После поездки', createdAt: '2026-08-27T08:00:00.000Z', updatedAt: '2026-08-27T08:00:00.000Z' },
  { id: 'wd5', userId: 'danya', date: '2026-09-01', weight: 118.9, note: '', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z' },
  { id: 'wd6', userId: 'danya', date: '2026-09-05', weight: 118.6, note: '', createdAt: '2026-09-05T08:00:00.000Z', updatedAt: '2026-09-05T08:00:00.000Z' },
  { id: 'wd7', userId: 'danya', date: '2026-09-08', weight: 118.4, note: 'Утром натощак', createdAt: '2026-09-08T08:00:00.000Z', updatedAt: '2026-09-08T08:00:00.000Z' },
  { id: 'wv1', userId: 'vika', date: '2026-08-03', weight: 64.1, note: '', createdAt: '2026-08-03T08:00:00.000Z', updatedAt: '2026-08-03T08:00:00.000Z' },
  { id: 'wv2', userId: 'vika', date: '2026-08-17', weight: 63.8, note: '', createdAt: '2026-08-17T08:00:00.000Z', updatedAt: '2026-08-17T08:00:00.000Z' },
  { id: 'wv3', userId: 'vika', date: '2026-09-01', weight: 63.5, note: '', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z' },
  { id: 'wv4', userId: 'vika', date: '2026-09-07', weight: 63.3, note: 'После завтрака', createdAt: '2026-09-07T08:00:00.000Z', updatedAt: '2026-09-07T08:00:00.000Z' },
]

export const todayISO = () => new Date().toLocaleDateString('en-CA')
export const prettyDate = (iso) => new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`))
export const shiftDate = (iso, days) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA') }
export const getGoal = (goals, userId, date) => goals.filter(g => g.userId === userId && g.startDate <= date).sort((a,b) => b.startDate.localeCompare(a.startDate))[0] || { calories: 0, protein: 0, fat: 0, carbs: 0 }

export const getWeekStart = (iso = todayISO()) => {
  const date = new Date(`${iso}T12:00:00`)
  const daysFromMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysFromMonday)
  return date.toLocaleDateString('en-CA')
}

export const formatWeekRange = weekStart => {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(`${shiftDate(weekStart, 6)}T12:00:00`)
  const day = value => value.getDate()
  const month = value => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(value).replace(/^\d+\s*/, '')
  if (start.getFullYear() !== end.getFullYear()) {
    return `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(end)}`
  }
  if (start.getMonth() !== end.getMonth()) return `${day(start)} ${month(start)} – ${day(end)} ${month(end)}`
  return `${day(start)}–${day(end)} ${month(end)}`
}

const NUTRIENTS = ['calories', 'protein', 'fat', 'carbs']
const emptyNutrients = () => ({ calories: 0, protein: 0, fat: 0, carbs: 0 })
const addNutrients = (total, values) => NUTRIENTS.reduce((result, key) => ({ ...result, [key]: result[key] + Number(values[key] || 0) }), total)
const calorieStatus = (fact, plan) => {
  if (!plan) return { key: 'neutral', label: 'Нет цели' }
  const deviation = (fact - plan) / plan
  if (deviation < -.05) return { key: 'deficit', label: 'Дефицит' }
  if (deviation > .05) return { key: 'surplus', label: 'Профицит' }
  return { key: 'close', label: 'Близко к плану' }
}

export function getWeekReport(data, userId, weekStart) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(weekStart, index)
    const entries = data.entries.filter(entry => entry.userId === userId && entry.date === date)
    const fact = entries.reduce((total, entry) => addNutrients(total, entry), emptyNutrients())
    const goal = getGoal(data.goals, userId, date)
    const plan = NUTRIENTS.reduce((result, key) => ({ ...result, [key]: Number(goal[key] || 0) }), {})
    const difference = NUTRIENTS.reduce((result, key) => ({ ...result, [key]: fact[key] - plan[key] }), {})
    return { date, plan, fact, difference, status: calorieStatus(fact.calories, plan.calories), hasEntries: entries.length > 0 }
  })
  const plan = days.reduce((total, item) => addNutrients(total, item.plan), emptyNutrients())
  const fact = days.reduce((total, item) => addNutrients(total, item.fact), emptyNutrients())
  const difference = NUTRIENTS.reduce((result, key) => ({ ...result, [key]: fact[key] - plan[key] }), {})
  const average = NUTRIENTS.reduce((result, key) => ({ ...result, [key]: fact[key] / 7 }), {})
  const hasEntries = days.some(dayItem => dayItem.hasEntries)
  const assessment = []
  if (!hasEntries) {
    assessment.push('Пока недостаточно данных для оценки')
  } else if (plan.calories > 0) {
    const calorieDeviation = difference.calories / plan.calories
    assessment.push(calorieDeviation < -.05 ? 'Неделя в дефиците' : calorieDeviation > .05 ? 'Неделя в профиците' : 'Неделя близко к плану')
  } else {
    assessment.push('Недостаточно данных о цели')
  }
  if (hasEntries && plan.protein > 0 && fact.protein < plan.protein * .9) assessment.push('Белка немного не хватило')
  if (hasEntries && plan.fat > 0 && fact.fat > plan.fat * 1.15) assessment.push('Жиров было многовато')
  if (hasEntries && plan.carbs > 0 && fact.carbs < plan.carbs * .85) assessment.push('Углеводов было мало')
  return { weekStart, weekEnd: shiftDate(weekStart, 6), days, plan, fact, difference, average, assessment, hasEntries }
}

export function getWeightStats(entries, userId, referenceDate = todayISO()) {
  const records = entries.filter(entry => entry.userId === userId && entry.date <= referenceDate).sort((a, b) => a.date.localeCompare(b.date))
  const latest = records.at(-1) || null
  const changeFrom = days => {
    if (!latest) return null
    const targetDate = shiftDate(latest.date, -days)
    const baseline = records.filter(entry => entry.date <= targetDate).at(-1)
    return baseline ? { value: Number(latest.weight) - Number(baseline.weight), baseline } : null
  }
  const weekStart = getWeekStart(referenceDate)
  const weekEnd = shiftDate(weekStart, 6)
  const weekRecords = records.filter(entry => entry.date >= weekStart && entry.date <= weekEnd)
  const weekAverage = weekRecords.length ? weekRecords.reduce((total, entry) => total + Number(entry.weight), 0) / weekRecords.length : null
  return { records, latest, weekAverage, weekCount: weekRecords.length, weekChange: changeFrom(7), monthChange: changeFrom(30) }
}

export function filterWeightPeriod(entries, period, referenceDate = todayISO()) {
  const sorted = [...entries].filter(entry => entry.date <= referenceDate).sort((a, b) => a.date.localeCompare(b.date))
  if (period === 'all') return sorted
  const days = period === '7' ? 7 : 30
  const start = shiftDate(referenceDate, -(days - 1))
  return sorted.filter(entry => entry.date >= start)
}

export function calculate(food, amount, unit) {
  const measure = food.measures?.find(m => m.unit === unit)
  const baseQuantity = unit === food.baseUnit ? amount : amount * (measure?.amountInBase || food.baseAmount)
  const factor = baseQuantity / food.baseAmount
  return { calories: food.calories * factor, protein: food.protein * factor, fat: food.fat * factor, carbs: food.carbs * factor }
}
