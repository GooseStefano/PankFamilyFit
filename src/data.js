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

export const todayISO = () => new Date().toLocaleDateString('en-CA')
export const prettyDate = (iso) => new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00`))
export const shiftDate = (iso, days) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA') }
export const getGoal = (goals, userId, date) => goals.filter(g => g.userId === userId && g.startDate <= date).sort((a,b) => b.startDate.localeCompare(a.startDate))[0] || { calories: 0, protein: 0, fat: 0, carbs: 0 }

export function calculate(food, amount, unit) {
  const measure = food.measures?.find(m => m.unit === unit)
  const baseQuantity = unit === food.baseUnit ? amount : amount * (measure?.amountInBase || food.baseAmount)
  const factor = baseQuantity / food.baseAmount
  return { calories: food.calories * factor, protein: food.protein * factor, fat: food.fat * factor, carbs: food.carbs * factor }
}
