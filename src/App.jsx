import { useEffect, useRef, useState } from 'react'
import {
  Apple, Archive, CalendarDays, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, CircleUserRound,
  Clock3, CookingPot, Copy, FileQuestion, Flame, History, LogOut, MessageSquareText, PackageOpen,
  PackagePlus, Pencil, Plus, Search, Settings, SlidersHorizontal, Star, Trash2, Utensils, X,
  Scale, Dumbbell,
} from 'lucide-react'
import { CATEGORIES, MEALS, UNIT_LABELS, USERS, WEIGHT_PACES, amountInBase, calculate, calculateRecipe, filterWeightPeriod, formatWeekRange, getGoal, getNutritionAnalytics, getWeekReport, getWeekStart, getWeightGoal, getWeightGoalProgress, getWeightStats, prettyDate, shiftDate, todayISO } from './data'
import { useStore } from './useStore'
import { storage } from './services/storage'
import WorkoutPage from './WorkoutPage'
import { DailyMessages, PhraseSettings, TomorrowMessageSettings } from './DailyMessages'
import BackupSettings from './BackupSettings'

const round = n => Math.round((Number(n) || 0) * 10) / 10
const sum = rows => rows.reduce((a, e) => ({
  calories: a.calories + Number(e.calories || 0), protein: a.protein + Number(e.protein || 0),
  fat: a.fat + Number(e.fat || 0), carbs: a.carbs + Number(e.carbs || 0),
}), { calories: 0, protein: 0, fat: 0, carbs: 0 })
const foodKind = food => food.sourceType === 'recipe' ? 'рецепт блюдо' : food.type === 'dish' ? 'блюдо' : 'продукт'
const matchesFoodSearch = (food, query) => {
  const term = query.trim().toLocaleLowerCase('ru-RU')
  return !term || [food.name, food.category, food.type, food.sourceType, foodKind(food)].some(value => String(value || '').toLocaleLowerCase('ru-RU').includes(term))
}
const sortFoods = foods => [...foods].sort((a, b) => Number(b.favorite) - Number(a.favorite) || Number(b.usageCount || 0) - Number(a.usageCount || 0) || a.name.localeCompare(b.name, 'ru'))

function Toast({ message }) {
  return <div className={`toast ${message ? 'show' : ''}`} role="status" aria-live="polite">
    <CheckCircle2 aria-hidden="true" /><span>{message}</span>
  </div>
}

function Login({ onLogin, offline, hasOfflineSnapshot }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('')
    if (offline) { setError('Оффлайн: вход через Supabase недоступен. Подключитесь к интернету.'); setBusy(false); return }
    try {
      const session = await storage.login(pin)
      onLogin(USERS.find(user => user.id === session.id) || { id: session.id, name: session.name, role: session.role })
    } catch (reason) { setError(reason.message || 'Не удалось выполнить вход.'); setPin('') }
    finally { setBusy(false) }
  }
  return <main className="login-shell"><section className="login-card">
    <div className="brand-mark"><Apple size={28} aria-hidden="true" /></div>
    <p className="eyebrow">PANK FAMILY FIT</p><h1>Ваш дневник питания</h1>
    <p className="muted">Спокойно следим за КБЖУ — без лишнего шума.</p>
    {offline && <div className="login-offline" role="status"><strong>Оффлайн</strong><span>{hasOfflineSnapshot ? 'Для входа через Supabase нужен интернет. Ранее открытый сеанс сохраняет доступ к локальному снимку.' : 'Нет сохранённого снимка. Откройте приложение онлайн хотя бы один раз.'}</span></div>}
    <form onSubmit={submit}>
      <label htmlFor="pin">Введите PIN</label>
      <input id="pin" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength="5" value={pin}
        onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }} className="pin-input"
        placeholder="•••••" aria-invalid={!!error} aria-describedby="pin-error" />
      <div id="pin-error" className="field-error" role="alert">{error}</div>
      <button className="primary wide" disabled={pin.length !== 5 || busy || offline}>{busy ? 'Проверяем…' : 'Войти'}</button>
    </form>
    <p className="privacy">{storage.mode === 'supabase' ? 'PIN проверяется защищённой функцией Supabase и не сохраняется на устройстве.' : 'Локальный режим: данные остаются на этом устройстве.'}</p>
  </section></main>
}

function MacroCard({ total, goal }) {
  const pct = Math.min(100, goal.calories ? total.calories / goal.calories * 100 : 0)
  const macros = [['Белки', total.protein, goal.protein], ['Жиры', total.fat, goal.fat], ['Углеводы', total.carbs, goal.carbs]]
  return <section className="macro-card" aria-label="Итоги КБЖУ">
    <div className="calorie-head"><div><span className="section-label">КАЛОРИИ</span><div className="calories">{round(total.calories)} <small>/ {goal.calories}</small></div></div>
      <div className="remaining"><Flame size={17} aria-hidden="true" /><span>Осталось</span><strong>{Math.max(0, round(goal.calories - total.calories))}</strong></div></div>
    <div className="progress" role="progressbar" aria-label="Прогресс калорий" aria-valuemin="0" aria-valuemax="100" aria-valuenow={round(pct)}><i style={{ width: `${pct}%` }} /></div>
    <div className="macro-grid">{macros.map(([label, val, max]) => <div key={label}><span>{label}</span><strong>{round(val)} <small>/ {max} г</small></strong></div>)}</div>
  </section>
}

function DayPicker({ date, setDate }) {
  const today = todayISO(); const isToday = date === today; const inputRef = useRef(null)
  return <div className="date-row">
    <button className="icon-button" aria-label="Предыдущий день" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft /></button>
    <button className="date-title" onClick={() => inputRef.current?.showPicker()}>
      <strong>{isToday ? 'Сегодня' : prettyDate(date)}</strong><span>{new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU')}</span>
      <input ref={inputRef} type="date" value={date} max={today} onChange={e => setDate(e.target.value)} tabIndex="-1" />
    </button>
    <button className="icon-button" aria-label="Следующий день" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))}><ChevronRight /></button>
  </div>
}

function AddFoodModal({ foods, initial, initialMeal, initialDate, onClose, onSave, onCreate }) {
  const [selected, setSelected] = useState(initial ? foods.find(f => f.id === initial.foodItemId) : null)
  const [query, setQuery] = useState(''); const [amount, setAmount] = useState(initial?.amount ?? 100)
  const [unit, setUnit] = useState(initial?.unit || 'g'); const [meal, setMeal] = useState(initial?.mealType || initialMeal || 'breakfast')
  const [date, setDate] = useState(initial?.date || initialDate || todayISO()); const [amountTouched, setAmountTouched] = useState(false)
  const activeFoods = foods.filter(food => !food.archived)
  const visibleFoods = sortFoods(activeFoods.filter(food => matchesFoodSearch(food, query))).slice(0, 7)
  const frequentFoods = sortFoods(activeFoods.filter(food => food.favorite || Number(food.usageCount || 0) > 0)).slice(0, 6)
  const amountNumber = Number(amount); const amountInvalid = amount === '' || !Number.isFinite(amountNumber) || amountNumber <= 0
  const available = selected ? [{ unit: selected.baseUnit, label: UNIT_LABELS[selected.baseUnit] }, ...(selected.measures || [])] : []
  const calc = selected && !amountInvalid ? calculate(selected, amountNumber, unit) : null
  const quickAmounts = unit === 'g' || unit === 'ml' ? [50, 100, 150, 200, 250, 300] : []
  const choose = f => { setSelected(f); setUnit(f.baseUnit); setAmount(f.baseAmount); setAmountTouched(false) }
  const submit = e => {
    e.preventDefault(); setAmountTouched(true)
    if (!selected || amountInvalid) return
    onSave({ ...initial, id: initial?.id || crypto.randomUUID(), foodItemId: selected.id, foodName: selected.name, amount: amountNumber, unit, mealType: meal, date, ...calc })
  }
  return <div className="scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <header><div><span className="section-label">ДНЕВНИК</span><h2 id="add-title">{initial ? 'Изменить запись' : 'Добавить еду'}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X /></button></header>
      <form onSubmit={submit}>{!selected ? <>
        <label htmlFor="food-search">Найти продукт</label>
        <div className="search"><Search aria-hidden="true" /><input id="food-search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Например, овсянка" /></div>
        {!query && frequentFoods.length > 0 && <section className="frequent-foods" aria-label="Частые продукты"><span className="section-label">ЧАСТЫЕ</span><div className="frequent-food-grid">{frequentFoods.map(food => <button type="button" key={food.id} onClick={() => choose(food)}><strong>{food.name}</strong><small>{food.favorite ? 'Избранное' : `${food.usageCount || 0} раз`}</small></button>)}</div></section>}
        {visibleFoods.length > 0 ? <><p className="food-results-title">{query ? 'Результаты поиска' : 'Все продукты и блюда'}</p><div className="food-results">{visibleFoods.map(f => <button type="button" key={f.id} onClick={() => choose(f)}>
          <div className="food-icon"><Utensils aria-hidden="true" /></div><span><strong>{f.name}</strong><small>{f.calories} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}</small></span><ChevronRight aria-hidden="true" />
        </button>)}</div></> : <div className="compact-empty"><Search aria-hidden="true" /><strong>{query ? 'Ничего не найдено' : 'База продуктов пуста'}</strong><span>{query ? 'Проверьте название, категорию или тип.' : 'Создайте первый продукт.'}</span></div>}
        <div className="quick-create-actions"><button type="button" className="secondary" onClick={() => onCreate({ meal, date, type: 'product' })}><PackagePlus aria-hidden="true" />Создать продукт</button>
          <button type="button" className="secondary" onClick={() => onCreate({ meal, date, type: 'dish' })}><CookingPot aria-hidden="true" />Простое блюдо</button></div>
        <button className="primary wide" disabled>Сначала выберите продукт</button>
      </> : <>
        <button type="button" className="selected-food" onClick={() => setSelected(null)}><span><small>Продукт</small><strong>{selected.name}</strong></span><span>Изменить</span></button>
        <div className="form-grid"><label htmlFor="food-amount">Количество<input id="food-amount" type="number" min="0.1" step="0.1" value={amount}
          onBlur={() => setAmountTouched(true)} onChange={e => { setAmount(e.target.value); setAmountTouched(true) }} aria-invalid={amountTouched && amountInvalid} aria-describedby="amount-error" /></label>
          <label>Единица<select value={unit} onChange={e => setUnit(e.target.value)}>{available.map(m => <option key={m.unit} value={m.unit}>{m.label}</option>)}</select></label></div>
        {quickAmounts.length > 0 && <div className="quick-portions" aria-label={`Быстрые порции в ${UNIT_LABELS[unit] || unit}`}>{quickAmounts.map(value => <button type="button" key={value} onClick={() => { setAmount(value); setAmountTouched(true) }}>{value} {UNIT_LABELS[unit] || unit}</button>)}</div>}
        <div id="amount-error" className="field-error" role="alert">{amountTouched && amountInvalid ? 'Укажите количество больше нуля.' : ''}</div>
        <div className="form-grid"><label>Приём пищи<select value={meal} onChange={e => setMeal(e.target.value)}>{Object.entries(MEALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Дата<input type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} /></label></div>
        <div className={`calculation ${!calc ? 'invalid' : ''}`} aria-live="polite"><span><strong>{calc ? round(calc.calories) : '—'}</strong> ккал</span><span>Б <strong>{calc ? round(calc.protein) : '—'}</strong></span><span>Ж <strong>{calc ? round(calc.fat) : '—'}</strong></span><span>У <strong>{calc ? round(calc.carbs) : '—'}</strong></span></div>
        <button className="primary wide" disabled={amountInvalid}>{initial ? 'Сохранить изменения' : 'Добавить в дневник'}</button>
      </>}</form>
    </section>
  </div>
}

function RepeatEntryModal({ entry, date, onClose, onSave }) {
  const [meal, setMeal] = useState(entry.mealType)
  const submit = event => { event.preventDefault(); onSave(meal) }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="sheet repeat-sheet" role="dialog" aria-modal="true" aria-labelledby="repeat-entry-title">
    <header><div><span className="section-label">ПОВТОРИТЬ ЕДУ</span><h2 id="repeat-entry-title">{entry.foodName}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X /></button></header>
    <form onSubmit={submit}><div className="repeat-summary"><strong>{entry.amount} {UNIT_LABELS[entry.unit] || entry.unit}</strong><span>{round(entry.calories)} ккал · Б {round(entry.protein)} · Ж {round(entry.fat)} · У {round(entry.carbs)}</span></div><label>Добавить в приём пищи<select value={meal} onChange={event => setMeal(event.target.value)}>{Object.entries(MEALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p className="form-hint">Количество и снимок КБЖУ будут сохранены без изменений.</p><button className="primary wide"><Copy aria-hidden="true" />Повторить</button></form>
  </section></div>
}

function MealTemplateModal({ initial, initialItems, foods, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [mealType, setMealType] = useState(initial?.mealType || 'breakfast')
  const [rows, setRows] = useState(() => initialItems.map(item => ({ id: item.id, foodItemId: item.foodItemId, amount: item.amount, unit: item.unitLabel })))
  const retainedFoodIds = new Set(initialItems.map(item => item.foodItemId))
  const activeFoods = foods.filter(food => !food.archived || retainedFoodIds.has(food.id))
  const changeRow = (id, value) => setRows(current => current.map(row => row.id === id ? { ...row, ...value } : row))
  const addRow = () => setRows(current => [...current, { id: crypto.randomUUID(), foodItemId: '', amount: 100, unit: 'g' }])
  const prepared = rows.map(row => {
    const food = activeFoods.find(item => item.id === row.foodItemId)
    const nutrition = food && Number(row.amount) > 0 ? calculate(food, Number(row.amount), row.unit) : null
    return { ...row, food, nutrition }
  })
  const invalid = !name.trim() || prepared.length === 0 || prepared.some(row => !row.food || !row.nutrition)
  const submit = event => {
    event.preventDefault()
    if (invalid) return
    onSave({ name: name.trim(), mealType, items: prepared.map((row, index) => ({ id: row.id, foodItemId: row.food.id, foodName: row.food.name, amount: Number(row.amount), unitLabel: row.unit, ...row.nutrition, orderIndex: index })) })
  }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="sheet template-sheet" role="dialog" aria-modal="true" aria-labelledby="template-title">
    <header><div><span className="section-label">ШАБЛОН ЕДЫ</span><h2 id="template-title">{initial ? 'Изменить шаблон' : 'Новый шаблон'}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X /></button></header>
    <form onSubmit={submit}><label>Название<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Например, обычный завтрак" /></label><label>Приём пищи<select value={mealType} onChange={event => setMealType(event.target.value)}>{Object.entries(MEALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="template-items-head"><strong>Позиции</strong><span>{rows.length}</span></div>
      <div className="template-item-list">{prepared.map((row, index) => { const units = row.food ? [{ unit: row.food.baseUnit, label: UNIT_LABELS[row.food.baseUnit] }, ...(row.food.measures || [])] : []
        return <div className="template-item-form" key={row.id}><div className="template-item-title"><strong>Позиция {index + 1}</strong><button type="button" aria-label={`Удалить позицию ${index + 1}`} onClick={() => setRows(current => current.filter(item => item.id !== row.id))}><Trash2 /></button></div><label>Продукт<select value={row.foodItemId} onChange={event => { const food = activeFoods.find(item => item.id === event.target.value); changeRow(row.id, { foodItemId: event.target.value, unit: food?.baseUnit || 'g', amount: food?.baseAmount || 100 }) }}><option value="">Выберите продукт</option>{activeFoods.map(food => <option key={food.id} value={food.id} disabled={food.archived}>{food.name}{food.archived ? ' — архивный ингредиент' : ''}</option>)}</select></label><div className="form-grid"><label>Количество<input type="number" inputMode="decimal" min="0.1" step="0.1" value={row.amount} onChange={event => changeRow(row.id, { amount: event.target.value })} /></label><label>Единица<select disabled={!row.food} value={row.unit} onChange={event => changeRow(row.id, { unit: event.target.value })}>{units.map(item => <option key={item.unit} value={item.unit}>{item.label}</option>)}</select></label></div>{row.food?.archived && <small className="archived-ingredient">Архивный ингредиент: шаблон сохранит снимок КБЖУ.</small>}{row.food && row.nutrition && <small className="template-item-nutrition">{round(row.nutrition.calories)} ккал · Б {round(row.nutrition.protein)} · Ж {round(row.nutrition.fat)} · У {round(row.nutrition.carbs)}</small>}</div>})}</div>
      <button type="button" className="secondary wide" onClick={addRow}><Plus aria-hidden="true" />Добавить позицию</button><div className="field-error" role="alert">{invalid ? 'Укажите название и хотя бы одну позицию с корректным количеством.' : ''}</div><button className="primary wide" disabled={invalid}>{initial ? 'Сохранить шаблон' : 'Создать шаблон'}</button>
    </form>
  </section></div>
}

function MealTemplatesSettings({ data, update, notify }) {
  const [modal, setModal] = useState(null)
  const save = values => {
    const existing = modal?.template
    const now = new Date().toISOString(); const id = existing?.id || crypto.randomUUID()
    const template = { id, name: values.name, mealType: values.mealType, createdBy: 'danya', isActive: true, createdAt: existing?.createdAt || now, updatedAt: now }
    const items = values.items.map(item => ({ ...item, id: existing ? crypto.randomUUID() : item.id, templateId: id, createdAt: now, updatedAt: now }))
    update(current => ({ ...current, mealTemplates: [...current.mealTemplates.filter(item => item.id !== id), template], mealTemplateItems: [...current.mealTemplateItems.filter(item => item.templateId !== id), ...items] }))
    setModal(null); notify(existing ? 'Шаблон обновлён' : 'Шаблон создан')
  }
  const remove = template => {
    if (!window.confirm(`Удалить шаблон «${template.name}»? Это не удалит записи дневника.`)) return
    update(current => ({ ...current, mealTemplates: current.mealTemplates.filter(item => item.id !== template.id), mealTemplateItems: current.mealTemplateItems.filter(item => item.templateId !== template.id) })); notify('Шаблон удалён')
  }
  const templates = data.mealTemplates.filter(item => item.isActive !== false).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return <section className="settings-card meal-templates-settings" aria-labelledby="meal-templates-title"><div className="card-title"><div><span className="section-label">ШАБЛОНЫ ЕДЫ</span><h2 id="meal-templates-title">Как обычно</h2></div><CookingPot aria-hidden="true" /></div><p className="form-hint">Общие шаблоны доступны Дане и Вике, но менять их может только Даня.</p>{templates.length ? <div className="template-settings-list">{templates.map(template => <div key={template.id}><span><strong>{template.name}</strong><small>{MEALS[template.mealType]} · {data.mealTemplateItems.filter(item => item.templateId === template.id).length} поз.</small></span><div><button aria-label={`Изменить шаблон ${template.name}`} onClick={() => setModal({ template })}><Pencil /></button><button aria-label={`Удалить шаблон ${template.name}`} onClick={() => remove(template)}><Trash2 /></button></div></div>)}</div> : <p className="insight-empty">Шаблонов пока нет.</p>}<button className="secondary wide" onClick={() => setModal({})}><Plus aria-hidden="true" />Создать шаблон</button>{modal && <MealTemplateModal initial={modal.template || null} initialItems={modal.template ? data.mealTemplateItems.filter(item => item.templateId === modal.template.id).sort((a, b) => a.orderIndex - b.orderIndex) : []} foods={data.foods} onClose={() => setModal(null)} onSave={save} />}</section>
}

function RecipeModal({ foods, initial, initialIngredients, currentUser, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [category, setCategory] = useState(initial?.category || 'Готовое')
  const [cookedWeight, setCookedWeight] = useState(initial?.cookedWeight || '')
  const [favorite, setFavorite] = useState(Boolean(initial?.favorite))
  const [ingredients, setIngredients] = useState(() => initialIngredients.map(item => ({ id: item.id, foodItemId: item.ingredientFoodItemId, amount: item.amount, unit: item.unitLabel, query: '' })))
  const existingIngredientIds = new Set(initialIngredients.map(item => item.ingredientFoodItemId))
  const availableFoods = foods.filter(food => food.id !== initial?.id && (!food.archived || existingIngredientIds.has(food.id)))
  const addIngredient = () => setIngredients(rows => [...rows, { id: crypto.randomUUID(), foodItemId: '', amount: '', unit: 'g', query: '' }])
  const changeIngredient = (id, patch) => setIngredients(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row))
  const defaultUnit = food => {
    const units = [food.baseUnit, ...(food.measures || []).map(item => item.unit)]
    if (food.baseUnit === 'g' || food.baseUnit === 'ml') return food.baseUnit
    return units.includes('g') ? 'g' : units.includes('ml') ? 'ml' : food.baseUnit
  }
  const defaultAmount = unit => ['g', 'ml'].includes(unit) ? 100 : 1
  const duplicateIngredient = row => setIngredients(rows => [...rows, { ...row, id: crypto.randomUUID(), query: '' }])
  const removeIngredient = (row, index) => {
    const label = availableFoods.find(item => item.id === row.foodItemId)?.name || `ингредиент ${index + 1}`
    if (!window.confirm(`Удалить «${label}» из рецепта?`)) return
    setIngredients(rows => rows.filter(item => item.id !== row.id))
  }
  const prepared = ingredients.map(row => {
    const food = availableFoods.find(item => item.id === row.foodItemId)
    const amount = Number(row.amount)
    const nutrition = food && amount > 0 ? calculate(food, amount, row.unit) : null
    return { ...row, food, amount, nutrition, baseQuantity: food ? amountInBase(food, amount, row.unit) : 0 }
  })
  const snapshots = prepared.filter(row => row.food && row.nutrition).map(row => ({
    id: row.id,
    recipeFoodItemId: initial?.id || null,
    ingredientFoodItemId: row.food.id,
    amount: row.amount,
    unitLabel: row.unit,
    caloriesSnapshot: row.nutrition.calories,
    proteinSnapshot: row.nutrition.protein,
    fatSnapshot: row.nutrition.fat,
    carbsSnapshot: row.nutrition.carbs,
    createdAt: new Date().toISOString(),
  }))
  const cookedWeightNumber = Number(cookedWeight)
  const calculation = calculateRecipe(snapshots, cookedWeightNumber)
  const valid = Boolean(name.trim()) && Number.isFinite(cookedWeightNumber) && cookedWeightNumber > 0 && ingredients.length > 0 && prepared.every(row => row.food && Number.isFinite(row.amount) && row.amount > 0 && row.nutrition && Object.values(row.nutrition).every(Number.isFinite))
  const ingredientBaseTotal = prepared.reduce((total, row) => total + row.baseQuantity, 0)
  const weightWarning = cookedWeightNumber > 0 && ingredientBaseTotal > 0 && cookedWeightNumber < ingredientBaseTotal * .5
  const portion100 = calculation.per100
  const portion300 = Object.fromEntries(Object.entries(portion100).map(([key, value]) => [key, value * 3]))
  const ingredientWord = count => {
    const mod100 = count % 100; const mod10 = count % 10
    if (mod100 >= 11 && mod100 <= 14) return 'ингредиентов'
    if (mod10 === 1) return 'ингредиент'
    if (mod10 >= 2 && mod10 <= 4) return 'ингредиента'
    return 'ингредиентов'
  }
  const submit = event => {
    event.preventDefault()
    if (!valid) return
    const now = new Date().toISOString()
    const id = initial?.id || crypto.randomUUID()
    onSave({
      ...initial, id, name: name.trim(), type: 'dish', sourceType: 'recipe', category,
      baseUnit: 'g', baseAmount: 100, cookedWeight: cookedWeightNumber,
      calories: round(calculation.per100.calories), protein: round(calculation.per100.protein),
      fat: round(calculation.per100.fat), carbs: round(calculation.per100.carbs),
      favorite, archived: false, usageCount: initial?.usageCount || 0, measures: initial?.measures || [],
      createdBy: initial?.createdBy || currentUser.id, recipeVersion: (initial?.recipeVersion || 0) + 1,
      createdAt: initial?.createdAt || now, updatedAt: now,
    }, snapshots.map(item => ({ ...item, recipeFoodItemId: id })))
  }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="sheet recipe-sheet" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
    <header><div><span className="section-label">ДОМАШНЕЕ БЛЮДО</span><h2 id="recipe-title">{initial ? 'Изменить рецепт' : 'Блюдо из ингредиентов'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X /></button></header>
    <form onSubmit={submit}>
      <label htmlFor="recipe-name">Название<input id="recipe-name" autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Например, домашний плов" aria-invalid={!name.trim()} aria-describedby="recipe-name-error" /><span id="recipe-name-error" className="recipe-field-error">{!name.trim() ? 'Введите название блюда.' : ''}</span></label>
      <div className="form-grid"><label htmlFor="recipe-category">Категория<select id="recipe-category" value={category} onChange={event => setCategory(event.target.value)}>{CATEGORIES.slice(1).map(item => <option key={item}>{item}</option>)}</select></label>
        <label htmlFor="recipe-weight">Готовый вес, г<input id="recipe-weight" type="number" inputMode="decimal" min="0.1" step="0.1" value={cookedWeight} onChange={event => setCookedWeight(event.target.value)} placeholder="2400" aria-invalid={!Number.isFinite(cookedWeightNumber) || cookedWeightNumber <= 0} aria-describedby="recipe-weight-error recipe-weight-hint" /><span id="recipe-weight-error" className="recipe-field-error">{!Number.isFinite(cookedWeightNumber) || cookedWeightNumber <= 0 ? 'Укажите вес больше нуля.' : ''}</span></label></div>
      <p id="recipe-weight-hint" className="recipe-weight-hint">Взвесьте готовое блюдо без кастрюли/формы. Этот вес нужен для расчёта КБЖУ на 100 г.</p>
      {weightWarning && <div className="recipe-warning" role="status">Готовый вес сильно меньше суммы ингредиентов. Проверьте, всё ли верно.</div>}
      {initial && <div className="recipe-version-note"><strong>Будет создана версия {(initial.recipeVersion || 1) + 1}</strong><span>{initial.usageCount > 0 ? 'История дневника сохранит старые значения.' : 'КБЖУ блюда пересчитается после сохранения.'}</span></div>}
      <label className="recipe-favorite"><input type="checkbox" checked={favorite} onChange={event => setFavorite(event.target.checked)} /><span><Star aria-hidden="true" />Добавить в любимые</span></label>
      <div className="recipe-ingredients-head"><div><span className="section-label">СОСТАВ</span><h3>Ингредиенты</h3></div><button type="button" className="small-add" onClick={addIngredient}><Plus aria-hidden="true" />Ингредиент</button></div>
      {ingredients.length === 0 ? <div className="recipe-empty"><CookingPot aria-hidden="true" /><strong>Ингредиентов пока нет</strong><span>Добавьте продукты из базы, чтобы рассчитать блюдо.</span></div> : <div className="recipe-ingredient-list">{prepared.map((row, index) => {
        const units = row.food ? [{ unit: row.food.baseUnit, label: UNIT_LABELS[row.food.baseUnit] }, ...(row.food.measures || [])] : []
        const activeFoods = availableFoods.filter(food => !food.archived)
        const matches = activeFoods.filter(food => food.name.toLowerCase().includes(row.query.trim().toLowerCase()))
        const choices = row.food && !matches.some(food => food.id === row.food.id) ? [row.food, ...matches] : matches
        return <article className="recipe-ingredient" key={row.id}><div className="recipe-ingredient-title"><div><strong>{row.food?.name || `Ингредиент ${index + 1}`}</strong><span>Поля можно изменить прямо здесь</span></div><div className="ingredient-actions"><button type="button" aria-label={`Редактировать ингредиент ${index + 1}`} onClick={() => document.getElementById(`ingredient-search-${row.id}`)?.focus()}><Pencil /></button><button type="button" aria-label={`Дублировать ингредиент ${index + 1}`} disabled={!row.food} onClick={() => duplicateIngredient(row)}><Copy /></button><button type="button" aria-label={`Удалить ингредиент ${index + 1}`} onClick={() => removeIngredient(row, index)}><Trash2 /></button></div></div>
          <label htmlFor={`ingredient-search-${row.id}`}>Поиск продукта<input id={`ingredient-search-${row.id}`} value={row.query} onChange={event => changeIngredient(row.id, { query: event.target.value })} placeholder="Начните вводить название" /></label>
          {row.query && matches.length === 0 && <div className="ingredient-search-empty">По запросу ничего не найдено.</div>}
          {activeFoods.length === 0 && !row.food && <div className="ingredient-search-empty">Нет доступных продуктов. Архивированные продукты нельзя добавить в новый рецепт.</div>}
          <label>Продукт<select value={row.foodItemId} disabled={activeFoods.length === 0 && !row.food} aria-invalid={!row.food} aria-describedby={`ingredient-error-${row.id}`} onChange={event => { const food = availableFoods.find(item => item.id === event.target.value); if (!food) { changeIngredient(row.id, { foodItemId: '', amount: '', unit: 'g', query: '' }); return } const unit = defaultUnit(food); changeIngredient(row.id, { foodItemId: food.id, amount: defaultAmount(unit), unit, query: '' }) }}><option value="">Выберите продукт</option>{choices.map(food => <option key={food.id} value={food.id} disabled={food.archived}>{food.name}{food.archived ? ' — в архиве' : ''}</option>)}</select></label>
          <div className="form-grid"><label>Количество<input type="number" inputMode="decimal" min="0.1" step="0.1" value={row.amount} aria-invalid={row.amount <= 0} aria-describedby={`ingredient-error-${row.id}`} onChange={event => changeIngredient(row.id, { amount: event.target.value })} /></label><label>Единица<select value={row.unit} disabled={!row.food} onChange={event => changeIngredient(row.id, { unit: event.target.value })}>{units.map(item => <option key={item.unit} value={item.unit}>{item.label}</option>)}</select></label></div>
          {!row.food ? <div id={`ingredient-error-${row.id}`} className="ingredient-error" role="alert">Выберите продукт.</div> : row.amount <= 0 ? <div id={`ingredient-error-${row.id}`} className="ingredient-error" role="alert">Количество должно быть больше нуля.</div> : <div className="ingredient-nutrition"><span><strong>{round(row.nutrition.calories)}</strong> ккал</span><span>Б <strong>{round(row.nutrition.protein)}</strong></span><span>Ж <strong>{round(row.nutrition.fat)}</strong></span><span>У <strong>{round(row.nutrition.carbs)}</strong></span></div>}
        </article>
      })}</div>}
      <section className="recipe-preview" aria-live="polite" aria-label="Предпросмотр расчёта блюда"><div className="recipe-preview-head"><div><span className="section-label">РАСЧЁТ</span><h3>Предпросмотр</h3></div><span>{ingredients.length} {ingredientWord(ingredients.length)} · {cookedWeightNumber > 0 ? `${cookedWeightNumber} г` : 'вес не указан'}</span></div>
        <div className="recipe-preview-block"><strong>Всего в блюде</strong><div className="ingredient-nutrition"><span><strong>{round(calculation.totals.calories)}</strong> ккал</span><span>Б <strong>{round(calculation.totals.protein)}</strong></span><span>Ж <strong>{round(calculation.totals.fat)}</strong></span><span>У <strong>{round(calculation.totals.carbs)}</strong></span></div></div>
        <div className="recipe-preview-block accent"><strong>На 100 г</strong><div className="ingredient-nutrition"><span><strong>{cookedWeightNumber > 0 ? round(portion100.calories) : '—'}</strong> ккал</span><span>Б <strong>{cookedWeightNumber > 0 ? round(portion100.protein) : '—'}</strong></span><span>Ж <strong>{cookedWeightNumber > 0 ? round(portion100.fat) : '—'}</strong></span><span>У <strong>{cookedWeightNumber > 0 ? round(portion100.carbs) : '—'}</strong></span></div></div>
        <div className="recipe-portions"><div><strong>Порция 100 г</strong><span>{cookedWeightNumber > 0 ? `${round(portion100.calories)} ккал · Б ${round(portion100.protein)} · Ж ${round(portion100.fat)} · У ${round(portion100.carbs)}` : 'Укажите готовый вес'}</span></div><div><strong>Порция 300 г</strong><span>{cookedWeightNumber > 0 ? `${round(portion300.calories)} ккал · Б ${round(portion300.protein)} · Ж ${round(portion300.fat)} · У ${round(portion300.carbs)}` : 'Укажите готовый вес'}</span></div></div>
      </section>
      <div className="recipe-validation" role="status">{valid ? 'Блюдо готово к сохранению.' : 'Заполните название, готовый вес и все ингредиенты.'}</div>
      <button className="primary wide" disabled={!valid}>Сохранить блюдо</button>
    </form>
  </section></div>
}

function ProductModal({ type = 'product', currentUser, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type, category: 'Другое', baseUnit: 'g', baseAmount: 100, calories: '', protein: '', fat: '', carbs: '', measures: [] })
  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const baseUnit = val => setForm(f => {
    const fallbackUnit = Object.keys(UNIT_LABELS).find(unitName => unitName !== val)
    return {
      ...f,
      baseUnit: val,
      baseAmount: ['piece', 'portion'].includes(val) ? 1 : 100,
      measures: f.measures.map(measure => measure.unit === val ? { ...measure, unit: fallbackUnit, label: `1 ${UNIT_LABELS[fallbackUnit]}` } : measure),
    }
  })
  const addMeasure = () => setForm(f => {
    const unitName = Object.keys(UNIT_LABELS).find(value => value !== f.baseUnit)
    return { ...f, measures: [...f.measures, { id: crypto.randomUUID(), unit: unitName, label: `1 ${UNIT_LABELS[unitName]}`, amountInBase: 1 }] }
  })
  const measureField = (index, key, val) => setForm(f => ({ ...f, measures: f.measures.map((m, i) => i === index ? { ...m, [key]: val } : m) }))
  const submit = e => {
    e.preventDefault()
    onSave({ ...form, id: crypto.randomUUID(), sourceType: 'manual', baseAmount: Number(form.baseAmount), calories: Number(form.calories), protein: Number(form.protein), fat: Number(form.fat), carbs: Number(form.carbs), favorite: false, archived: false, usageCount: 0, createdBy: currentUser.id, measures: form.measures.map(m => ({ ...m, id: m.id || crypto.randomUUID(), amountInBase: Number(m.amountInBase) })) })
  }
  return <div className="scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="product-title">
    <header><div><span className="section-label">БАЗА</span><h2 id="product-title">{type === 'dish' ? 'Новое блюдо' : 'Новый продукт'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X /></button></header>
    <form onSubmit={submit}><label>Название<input required value={form.name} onChange={e => field('name', e.target.value)} placeholder="Например, творог 5%" /></label>
      <div className="form-grid"><label>Категория<select value={form.category} onChange={e => field('category', e.target.value)}>{CATEGORIES.slice(1).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>База<select value={form.baseUnit} onChange={e => baseUnit(e.target.value)}><option value="g">на 100 г</option><option value="ml">на 100 мл</option><option value="piece">на 1 штуку</option><option value="portion">на 1 порцию</option></select></label></div>
      <p className="form-hint">КБЖУ на выбранную базовую единицу</p>
      <div className="nutrient-inputs">{[['calories', 'Ккал'], ['protein', 'Белки'], ['fat', 'Жиры'], ['carbs', 'Углеводы']].map(([k, l]) => <label key={k}>{l}<input required type="number" min="0" step="0.1" value={form[k]} onChange={e => field(k, e.target.value)} /></label>)}</div>
      <div className="measure-head"><div><strong>Дополнительные меры</strong><span>Например, 1 стакан = 250 мл</span></div><button type="button" className="small-add" onClick={addMeasure}><Plus />Добавить</button></div>
      {form.measures.map((m, i) => <div className="measure-row" key={i}><label>Мера<select value={m.unit} onChange={e => { const value = e.target.value; measureField(i, 'unit', value); measureField(i, 'label', `1 ${UNIT_LABELS[value]}`) }}>{Object.entries(UNIT_LABELS).filter(([u]) => u !== form.baseUnit).map(([u, l]) => <option key={u} value={u}>{l}</option>)}</select></label>
        <label>В базовых ед.<input required type="number" min="0.1" step="0.1" value={m.amountInBase} onChange={e => measureField(i, 'amountInBase', e.target.value)} /></label><button type="button" aria-label="Удалить меру" onClick={() => setForm(f => ({ ...f, measures: f.measures.filter((_, x) => x !== i) }))}><X /></button></div>)}
      <button className="primary wide">Сохранить</button>
    </form>
  </section></div>
}

function DayNote({ value, onSave, onDelete }) {
  const [draft, setDraft] = useState(value || ''); const hasSaved = Boolean(value)
  useEffect(() => setDraft(value || ''), [value])
  return <section className="note-card">
    <div className="note-title"><label htmlFor="day-note">Комментарий к дню</label>{hasSaved && <button className="note-delete" aria-label="Удалить комментарий" onClick={onDelete}><Trash2 /></button>}</div>
    {!hasSaved && !draft && <div className="note-empty"><MessageSquareText aria-hidden="true" /><span>Комментария к этому дню пока нет.</span></div>}
    <textarea id="day-note" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Как прошёл день? Самочувствие, сон…" />
    <div className="note-footer"><span>{draft === value ? 'Все изменения сохранены' : 'Есть несохранённые изменения'}</span><button className="secondary" disabled={!draft.trim() || draft === value} onClick={() => onSave(draft.trim())}>Сохранить</button></div>
  </section>
}

const WEEKDAYS = [['1', 'Пн'], ['2', 'Вт'], ['3', 'Ср'], ['4', 'Чт'], ['5', 'Пт'], ['6', 'Сб'], ['7', 'Вс']]
const weekdayKey = date => String((new Date(`${date}T12:00:00`).getDay() + 6) % 7 + 1)
const visibleFor = (habit, userId) => habit.visibility === 'both' || habit.visibility === userId

function TodayChecklist({ viewer, profile, data, update, date }) {
  const tomorrow = shiftDate(date, 1)
  const auto = []
  if (!data.weightEntries.some(item => item.userId === profile.id && item.date === date)) auto.push('Записать вес')
  if (!data.entries.some(item => item.userId === profile.id && item.date === date)) auto.push('Добавить еду')
  if (profile.id === 'danya' && !data.workoutSessions.some(item => item.userId === 'danya' && item.date === date)) auto.push('Запланировать или записать тренировку')
  if (viewer.id === 'vika' && !data.directMessages.some(item => item.fromUserId === 'vika' && item.toUserId === 'danya' && item.showDate === tomorrow)) auto.push('Написать Дане на завтра')
  const recentEntryDays = new Set(data.entries.filter(item => item.userId === profile.id && item.date >= shiftDate(date, -13) && item.date <= date).map(item => item.date)).size
  if (recentEntryDays < 3) auto.push('Добавить больше записей для отчётов')
  const currentGoal = getGoal(data.goals, profile.id, date)
  if (!currentGoal.startDate || currentGoal.startDate <= shiftDate(date, -42)) auto.push('Проверить цель КБЖУ')
  const habits = data.habitItems.filter(habit => habit.isActive && visibleFor(habit, viewer.id) && (habit.weekdays || []).includes(weekdayKey(date)))
  const completedIds = new Set(data.habitCompletions.filter(item => item.userId === viewer.id && item.date === date).map(item => item.habitItemId))
  const toggleHabit = habit => update(current => {
    const existing = current.habitCompletions.find(item => item.habitItemId === habit.id && item.userId === viewer.id && item.date === date)
    return { ...current, habitCompletions: existing ? current.habitCompletions.filter(item => item.id !== existing.id) : [...current.habitCompletions, { id: crypto.randomUUID(), habitItemId: habit.id, userId: viewer.id, date, createdAt: new Date().toISOString() }] }
  })
  if (!auto.length && !habits.length) return null
  return <section className="today-checklist" aria-labelledby="today-checklist-title"><div className="checklist-head"><div><span className="section-label">СЕГОДНЯ НУЖНО</span><h2 id="today-checklist-title">Небольшой чеклист</h2></div><span>{auto.length + habits.length}</span></div>{auto.map(item => <div className="checklist-row auto" key={item}><span>{item}</span></div>)}{habits.map(habit => <button className={`checklist-row habit ${completedIds.has(habit.id) ? 'done' : ''}`} key={habit.id} aria-pressed={completedIds.has(habit.id)} onClick={() => toggleHabit(habit)}><CheckCircle2 aria-hidden="true" /><span>{habit.name}</span><small>{completedIds.has(habit.id) ? 'Готово' : 'Отметить'}</small></button>)}</section>
}

function Today({ viewer, profile, setProfile, data, update, date, setDate, notify }) {
  const [meal, setMeal] = useState('breakfast'); const [modal, setModal] = useState(null); const [creating, setCreating] = useState(null); const [templatesOpen, setTemplatesOpen] = useState(false)
  const dayEntries = data.entries.filter(e => e.userId === profile.id && e.date === date); const mealEntries = dayEntries.filter(e => e.mealType === meal)
  const total = sum(dayEntries); const mealTotal = sum(mealEntries); const goal = getGoal(data.goals, profile.id, date); const noteKey = `${profile.id}:${date}`
  const note = data.notes[noteKey] || ''; const dayIsEmpty = dayEntries.length === 0 && !note
  const saveEntry = entry => {
    const editing = Boolean(modal?.entry)
    update(d => ({ ...d, entries: [...d.entries.filter(e => e.id !== entry.id), { ...entry, userId: profile.id }], foods: viewer.role === 'admin' ? d.foods.map(f => f.id === entry.foodItemId ? { ...f, usageCount: (f.usageCount || 0) + (editing ? 0 : 1) } : f) : d.foods }))
    setMeal(entry.mealType); setModal(null); notify(editing ? 'Запись обновлена' : 'Еда добавлена')
  }
  const addRepeatedEntries = (records, targetMeal, message) => {
    const copies = records.map(record => {
      const { id, createdAt, updatedAt, ...snapshot } = record
      return { ...snapshot, id: crypto.randomUUID(), date, mealType: targetMeal }
    })
    update(current => ({
      ...current,
      entries: [...current.entries, ...copies],
      foods: viewer.role === 'admin' ? current.foods.map(food => {
        const times = copies.filter(entry => entry.foodItemId === food.id).length
        return times ? { ...food, usageCount: (food.usageCount || 0) + times } : food
      }) : current.foods,
    }))
    setMeal(targetMeal); setModal(null); notify(message)
  }
  const repeatEntry = (entry, targetMeal) => addRepeatedEntries([entry], targetMeal, 'Еда повторена')
  const repeatYesterdayMeal = () => {
    const yesterdayEntries = data.entries.filter(entry => entry.userId === profile.id && entry.date === shiftDate(date, -1) && entry.mealType === meal)
    if (yesterdayEntries.length === 0) { notify(`Вчера в «${MEALS[meal].toLowerCase()}» записей не было`); return }
    if (!window.confirm(`Добавить ${yesterdayEntries.length} ${yesterdayEntries.length === 1 ? 'запись' : 'записи'} из вчерашнего ${MEALS[meal].toLowerCase()}? Текущие записи останутся.`)) return
    addRepeatedEntries(yesterdayEntries, meal, 'Приём пищи повторён из вчера')
  }
  const repeatLastMeal = () => {
    const dates = [...new Set(data.entries.filter(entry => entry.userId === profile.id && entry.date < date && entry.mealType === meal).map(entry => entry.date))].sort((a, b) => b.localeCompare(a))
    const sourceDate = dates[0]
    if (!sourceDate) { notify(`Прошлого «${MEALS[meal].toLowerCase()}» пока нет`); return }
    const records = data.entries.filter(entry => entry.userId === profile.id && entry.date === sourceDate && entry.mealType === meal)
    if (!window.confirm(`Добавить ${records.length} ${records.length === 1 ? 'запись' : 'записи'} из ${new Date(`${sourceDate}T12:00:00`).toLocaleDateString('ru-RU')}? Текущие записи останутся.`)) return
    addRepeatedEntries(records, meal, 'Последний приём пищи повторён')
  }
  const applyTemplate = template => {
    const items = data.mealTemplateItems.filter(item => item.templateId === template.id).sort((a, b) => a.orderIndex - b.orderIndex)
    if (!items.length) { notify('В этом шаблоне пока нет позиций'); return }
    if (!window.confirm(`Добавить ${items.length} ${items.length === 1 ? 'позицию' : 'позиции'} из «${template.name}» в «${MEALS[meal].toLowerCase()}»? Текущие записи останутся.`)) return
    addRepeatedEntries(items.map(item => ({ foodItemId: item.foodItemId, foodName: item.foodName, amount: item.amount, unit: item.unitLabel, calories: item.calories, protein: item.protein, fat: item.fat, carbs: item.carbs })), meal, 'Шаблон добавлен в дневник')
  }
  const templates = data.mealTemplates.filter(item => item.isActive !== false)
  const remove = id => {
    if (window.confirm('Удалить эту запись из дневника?')) { update(d => ({ ...d, entries: d.entries.filter(e => e.id !== id) })); notify('Запись удалена') }
  }
  const createFood = food => {
    update(d => ({ ...d, foods: [...d.foods, food] })); const context = creating
    setCreating(null); setModal({ meal: context?.meal || meal, date: context?.date || date }); notify(food.type === 'dish' ? 'Блюдо сохранено' : 'Продукт сохранён')
  }
  const saveNote = value => { update(d => ({ ...d, notes: { ...d.notes, [noteKey]: value } })); notify('Комментарий сохранён') }
  const deleteNote = () => {
    if (!window.confirm('Удалить комментарий к этому дню?')) return
    update(d => { const notes = { ...d.notes }; delete notes[noteKey]; return { ...d, notes } }); notify('Запись удалена')
  }
  return <>
    <div className="topbar"><div><p className="eyebrow">PANK FAMILY FIT</p>{viewer.role === 'admin' ? <div className="profile-switch">{USERS.map(u => <button key={u.id} className={profile.id === u.id ? 'active' : ''} onClick={() => setProfile(u)}>{u.name}</button>)}</div> : <h1>Привет, {viewer.name}</h1>}</div><div className="avatar">{profile.name[0]}</div></div>
    <DayPicker date={date} setDate={setDate} />
    <TodayChecklist viewer={viewer} profile={profile} data={data} update={update} date={date} />
    {viewer.id === 'vika' && <DailyMessages viewer={viewer} date={date} data={data} update={update} notify={notify} />}
    <MacroCard total={total} goal={goal} />
    {viewer.id === 'danya' && <DailyMessages viewer={viewer} date={date} data={data} update={update} notify={notify} />}
    {date !== todayISO() && dayIsEmpty && <div className="day-empty"><FileQuestion aria-hidden="true" /><div><strong>На {prettyDate(date)} нет истории</strong><span>Добавьте еду или комментарий, чтобы создать запись дня.</span></div></div>}
    <section className="meal-section"><div className="meal-tabs" role="tablist">{Object.entries(MEALS).map(([k, v]) => <button role="tab" aria-selected={meal === k} className={meal === k ? 'active' : ''} key={k} onClick={() => setMeal(k)}>{v}</button>)}</div>
      <div className="meal-list">{mealEntries.length === 0 ? <div className="empty"><div className="empty-icon"><CookingPot aria-hidden="true" /></div><strong>В {MEALS[meal].toLowerCase()} пока нет еды</strong><span>Добавьте первую запись.</span></div> : mealEntries.map(e => <article className="meal-row" key={e.id}><div><strong>{e.foodName}</strong><span>{e.amount} {UNIT_LABELS[e.unit] || e.unit} · Б {round(e.protein)} · Ж {round(e.fat)} · У {round(e.carbs)}</span></div><strong>{round(e.calories)} <small>ккал</small></strong><div className="row-actions"><button aria-label={`Повторить ${e.foodName}`} onClick={() => setModal({ repeat: e })}><Copy /></button><button aria-label={`Изменить ${e.foodName}`} onClick={() => setModal({ entry: e })}><Pencil /></button><button aria-label={`Удалить ${e.foodName}`} onClick={() => remove(e.id)}><Trash2 /></button></div></article>)}</div>
      <div className="meal-quick-actions"><button className="secondary" onClick={repeatLastMeal}><Copy aria-hidden="true" />Как обычно</button><button className="secondary" onClick={repeatYesterdayMeal}><Copy aria-hidden="true" />Повторить из вчера</button></div>{templates.length > 0 && <><button className="secondary meal-repeat" aria-expanded={templatesOpen} onClick={() => setTemplatesOpen(value => !value)}><CookingPot aria-hidden="true" />{templatesOpen ? 'Скрыть шаблоны' : `Шаблоны (${templates.length})`}</button>{templatesOpen && <div className="meal-template-picker">{templates.map(template => <button key={template.id} onClick={() => applyTemplate(template)}><span><strong>{template.name}</strong><small>{MEALS[template.mealType]} · {data.mealTemplateItems.filter(item => item.templateId === template.id).length} поз.</small></span><Plus aria-hidden="true" /></button>)}</div>}</>}<div className="meal-total"><span>Итого за приём</span><strong>{round(mealTotal.calories)} ккал</strong></div><button className="primary wide" onClick={() => setModal({ meal, date })}><Plus aria-hidden="true" />Добавить еду</button>
    </section>
    <DayNote key={noteKey} value={note} onSave={saveNote} onDelete={deleteNote} />
    {modal?.repeat && <RepeatEntryModal entry={modal.repeat} date={date} onClose={() => setModal(null)} onSave={targetMeal => repeatEntry(modal.repeat, targetMeal)} />}
    {modal && !modal.repeat && <AddFoodModal foods={data.foods} initial={modal.entry || null} initialMeal={modal.meal || meal} initialDate={modal.date || date} onClose={() => setModal(null)} onSave={saveEntry} onCreate={context => { setModal(null); setCreating(context) }} />}
    {creating && <ProductModal type={creating.type || 'product'} currentUser={viewer} onClose={() => setCreating(null)} onSave={createFood} />}
  </>
}

const metricRows = [
  ['calories', 'Ккал', 'ккал'],
  ['protein', 'Белки', 'г'],
  ['fat', 'Жиры', 'г'],
  ['carbs', 'Углеводы', 'г'],
]

const signed = value => `${value > 0 ? '+' : ''}${round(value)}`

function WeeklyReport({ profile, data, openDay }) {
  const currentWeek = getWeekStart()
  const [weekStart, setWeekStart] = useState(currentWeek)
  const report = getWeekReport(data, profile.id, weekStart)
  const isCurrentWeek = weekStart === currentWeek
  const calorieRatio = report.plan.calories ? report.difference.calories / report.plan.calories : 0
  const calorieDeltaClass = Math.abs(calorieRatio) <= .05 ? 'neutral' : calorieRatio < 0 ? 'good' : 'warn'
  const weekLabel = formatWeekRange(weekStart)
  return <>
    <section className="week-picker" aria-label="Выбор недели">
      <button className="icon-button" aria-label="Предыдущая неделя" onClick={() => setWeekStart(shiftDate(weekStart, -7))}><ChevronLeft /></button>
      <div aria-live="polite"><span className="section-label">{isCurrentWeek ? 'ТЕКУЩАЯ НЕДЕЛЯ' : 'ВЫБРАННАЯ НЕДЕЛЯ'}</span><strong>{weekLabel}</strong></div>
      <button className="icon-button" aria-label="Следующая неделя" disabled={isCurrentWeek} onClick={() => setWeekStart(shiftDate(weekStart, 7))}><ChevronRight /></button>
    </section>
    {!isCurrentWeek && <button className="current-week-button" onClick={() => setWeekStart(currentWeek)}><CalendarRange aria-hidden="true" />К текущей неделе</button>}
    {!report.hasEntries && <div className="week-empty"><CalendarRange aria-hidden="true" /><div><strong>За эту неделю пока нет записей</strong><span>План рассчитан по действовавшим в эти дни целям.</span></div></div>}
    <section className="week-summary" aria-labelledby="week-summary-title">
      <div className="week-summary-head"><div><span className="section-label">ОТЧЁТ</span><h2 id="week-summary-title">Итог недели</h2></div><CalendarRange aria-hidden="true" /></div>
      <div className="report-table" role="table" aria-label="План, факт и разница за неделю">
        <div className="report-row report-header" role="row"><span role="columnheader">Показатель</span><span role="columnheader">План</span><span role="columnheader">Факт</span><span role="columnheader">Разница</span></div>
        {metricRows.map(([key, label, unit]) => <div className="report-row" role="row" key={key}>
          <strong role="rowheader">{label}</strong><span role="cell">{round(report.plan[key])}</span><span role="cell">{round(report.fact[key])}</span><span role="cell" className={`report-delta ${key === 'calories' ? calorieDeltaClass : 'neutral'}`}>{signed(report.difference[key])} <small>{unit}</small></span>
        </div>)}
      </div>
      <div className="week-assessment" aria-label="Оценка недели">{report.assessment.map((text, index) => <p key={text} className={index === 0 ? 'primary-assessment' : ''}>{text}</p>)}</div>
      <div className="average-title"><span className="section-label">СРЕДНЕЕ ЗА ДЕНЬ</span><span>{report.daysWithEntries ? `${report.daysWithEntries} дней с едой` : 'нет записей'}</span></div>
      <div className="average-grid">{metricRows.map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{round(report.average[key])} <small>{unit}</small></strong></div>)}</div>
    </section>
    <section className="week-days" aria-labelledby="week-days-title">
      <div className="week-days-head"><div><span className="section-label">ПО ДНЯМ</span><h2 id="week-days-title">Дни недели</h2></div><span>Факт / цель</span></div>
      <div className="week-day-list">{report.days.map(day => {
        const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`)).replace('.', '')
        const dateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${day.date}T12:00:00`)).replace('.', '')
        return <button key={day.date} onClick={() => openDay(day.date)} aria-label={`${weekday}, ${dateLabel}: ${day.fact.calories} из ${day.plan.calories} килокалорий, ${day.status.label}`}>
          <span className="day-date"><strong>{weekday}</strong><small>{dateLabel}</small></span>
          <span className="day-calories"><strong>{round(day.fact.calories)} <small>/ {round(day.plan.calories)}</small></strong><small>{day.hasEntries ? `${signed(day.difference.calories)} ккал` : 'Без сравнения'}</small><small>Цель с {day.goal.startDate || '—'}</small></span>
          <span className={`day-status ${day.status.key}`}>{day.status.label}</span><ChevronRight aria-hidden="true" />
        </button>
      })}</div>
    </section>
  </>
}

function NutritionChart({ days }) {
  const populated = days.filter(day => day.hasEntries)
  if (populated.length < 2) return <div className="analytics-chart-empty">Пока мало данных для анализа. Добавьте записи за несколько дней.</div>
  const width = 360; const height = 144; const left = 8; const right = 8; const top = 14; const bottom = 25
  const max = Math.max(...days.map(day => day.fact.calories), ...days.map(day => day.plan.calories), 1)
  const slot = (width - left - right) / days.length
  return <div className="analytics-chart-wrap"><svg className="analytics-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`График калорий за ${days.length} дней`}>
    {[.33, .66, 1].map(ratio => <line key={ratio} className="chart-grid-line" x1={left} x2={width - right} y1={top + (1 - ratio) * (height - top - bottom)} y2={top + (1 - ratio) * (height - top - bottom)} />)}
    {days.map((day, index) => {
      const barHeight = day.fact.calories / max * (height - top - bottom)
      const goalY = top + (1 - Math.min(1, day.plan.calories / max)) * (height - top - bottom)
      const x = left + index * slot + Math.max(2, slot * .18)
      return <g key={day.date}><rect className="analytics-bar" x={x} y={top + (height - top - bottom - barHeight)} width={Math.max(4, slot * .64)} height={barHeight} rx="3"><title>{prettyDate(day.date)}: {round(day.fact.calories)} ккал</title></rect>{day.plan.calories > 0 && <line className="analytics-goal" x1={x} x2={x + Math.max(4, slot * .64)} y1={goalY} y2={goalY} />}</g>
    })}
    <text className="chart-axis-label" x={left} y={height - 7}>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${days[0].date}T12:00:00`)).replace('.', '')}</text>
    <text className="chart-axis-label" x={width - right} y={height - 7} textAnchor="end">{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${days.at(-1).date}T12:00:00`)).replace('.', '')}</text>
  </svg><div className="analytics-legend"><span><i className="fact" />Факт</span><span><i className="goal" />Цель</span></div></div>
}

const weightTrend = stats => {
  if (!stats.weekChange) return { key: 'unknown', label: 'Недостаточно данных' }
  const value = Number(stats.weekChange.value)
  if (Math.abs(value) < .2) return { key: 'stable', label: 'Стабилен' }
  return value < 0 ? { key: 'down', label: 'Снижается' } : { key: 'up', label: 'Растёт' }
}

function AnalyticsPage({ viewer, profile, setProfile, data, embedded = false }) {
  const [period, setPeriod] = useState('7')
  const report = getNutritionAnalytics(data, profile.id, period)
  const weightStats = getWeightStats(data.weightEntries, profile.id)
  const trend = weightTrend(weightStats)
  const periodWeights = filterWeightPeriod(weightStats.records, period)
  const weightGoal = getWeightGoal(data.weightGoals, profile.id)
  const goalProgress = getWeightGoalProgress(weightGoal, data.weightEntries, profile.id)
  const closeToGoal = report.plan.calories > 0 && Math.abs(report.calorieDifference / report.plan.calories) <= .05
  const hasEnough = report.daysWithEntries >= 3 && weightStats.records.length >= 2 && trend.key !== 'unknown'
  const insight = !hasEnough ? 'Пока мало данных для вывода. Добавьте записи за несколько дней.' : trend.key === 'down' && report.calorieDifference < 0 ? 'Вес снижается, калории в среднем ниже цели.' : trend.key === 'stable' && closeToGoal ? 'Вес стоит, а средние калории близко к цели.' : trend.key === 'up' && report.calorieDifference > 0 ? 'Вес растёт, средние калории выше цели.' : 'По выбранному периоду нет однозначной связи между весом и питанием.'
  const planLink = !weightGoal ? 'Цель веса пока не задана.' : report.daysWithEntries < 3 || periodWeights.length < 2 ? 'Пока мало данных для сравнения дефицита и динамики веса.' : goalProgress?.statusKey === 'stable' ? 'Вес стоит: по этому периоду заметной динамики пока нет.' : goalProgress?.statusKey === 'close' ? 'Темп близок к плану по доступным измерениям.' : goalProgress?.assessment || 'Пока мало данных для вывода.'
  return <>{!embedded && <PageHead eyebrow="АНАЛИТИКА" title="Отчёты" subtitle={`КБЖУ и вес · ${profile.name}`} />}
    {viewer.role === 'admin' && <div className="profile-switch compact analytics-profile" aria-label="Профиль отчёта">{USERS.map(user => <button key={user.id} className={profile.id === user.id ? 'active' : ''} onClick={() => setProfile(user)}>{user.name}</button>)}</div>}
    <div className="analytics-periods" role="tablist" aria-label="Период отчёта">{[['7', '7 дней'], ['14', '14 дней'], ['30', '30 дней']].map(([key, label]) => <button key={key} role="tab" aria-selected={period === key} className={period === key ? 'active' : ''} onClick={() => setPeriod(key)}>{label}</button>)}</div>
    {report.daysWithEntries < 2 ? <section className="analytics-empty"><CalendarRange aria-hidden="true" /><strong>Пока мало данных для анализа.</strong><span>Добавьте записи за несколько дней.</span></section> : <section className="analytics-card" aria-labelledby="nutrition-report-title"><div className="analytics-head"><div><span className="section-label">КБЖУ</span><h2 id="nutrition-report-title">За {period} дней</h2></div><span>{report.daysWithEntries}/{period} дней с едой</span></div><div className="analytics-summary"><div><span>Средние калории</span><strong>{round(report.average.calories)} <small>ккал</small></strong></div><div><span>Среднее отклонение</span><strong className={report.calorieDifference < 0 ? 'weight-down' : report.calorieDifference > 0 ? 'weight-up' : ''}>{signed(round(report.calorieDifference / report.daysWithEntries))} <small>ккал/день</small></strong></div></div><div className="analytics-macros">{metricRows.slice(1).map(([key, label]) => <div key={key}><span>{label}</span><strong>{round(report.average[key])} г</strong></div>)}</div><div className="analytics-days"><span>С записями: <strong>{report.daysWithEntries}</strong></span><span>Без записей: <strong>{report.daysWithoutEntries}</strong></span></div><NutritionChart days={report.days} /></section>}
      <section className="analytics-card" aria-labelledby="weight-report-title"><div className="analytics-head"><div><span className="section-label">ВЕС</span><h2 id="weight-report-title">Динамика</h2></div><span className={`trend ${trend.key}`}>{trend.label}</span></div>{weightStats.latest ? <><div className="analytics-weight-grid"><div><span>Последний вес</span><strong>{weightStats.latest.weight} <small>кг</small></strong></div><div><span>За 7 дней</span><ChangeValue change={weightStats.weekChange} /></div><div><span>За 30 дней</span><ChangeValue change={weightStats.monthChange} /></div><div><span>Среднее недели</span>{weightStats.weekAverage === null ? <span className="insufficient">Недостаточно данных</span> : <strong>{round(weightStats.weekAverage)} <small>кг</small></strong>}</div></div><WeightChart entries={periodWeights} /></> : <div className="analytics-chart-empty">Пока мало данных для анализа. Добавьте записи за несколько дней.</div>}</section>
      <section className="insight-card analytics-plan-link" aria-label="Связь плана веса и данных"><span className="section-label">ПЛАН ВЕСА</span><p>{planLink}</p></section>
      <section className="insight-card" aria-labelledby="insight-title"><span className="section-label">ЧТО ВИДНО ПО ПЕРИОДУ</span><h2 id="insight-title">Спокойный вывод</h2><p>{insight}</p></section>
  </>
}

function HistoryPage({ viewer, profile, setProfile, data, setDate, goToday }) {
  const [mode, setMode] = useState('reports')
  const dates = [...new Set([...data.entries.filter(e => e.userId === profile.id).map(e => e.date), ...Object.keys(data.notes).filter(k => k.startsWith(profile.id + ':')).map(k => k.split(':')[1])])].sort().reverse()
  return <><PageHead eyebrow={mode === 'reports' ? 'АНАЛИТИКА' : 'ДНЕВНИК'} title={mode === 'reports' ? 'Отчёты' : 'История'} subtitle={mode === 'reports' ? `КБЖУ и вес · ${profile.name}` : `Дневник · ${profile.name}`} />
    <div className="history-modes" role="tablist" aria-label="Раздел истории"><button role="tab" aria-selected={mode === 'reports'} className={mode === 'reports' ? 'active' : ''} onClick={() => setMode('reports')}><CalendarRange aria-hidden="true" />Отчёты</button><button role="tab" aria-selected={mode === 'days'} className={mode === 'days' ? 'active' : ''} onClick={() => setMode('days')}><CalendarDays aria-hidden="true" />Дни</button></div>
    {mode === 'reports' ? <AnalyticsPage embedded viewer={viewer} profile={profile} setProfile={setProfile} data={data} /> : <>{viewer.role === 'admin' && <div className="profile-switch compact history-profile" aria-label="Профиль истории">{USERS.map(user => <button key={user.id} className={profile.id === user.id ? 'active' : ''} onClick={() => setProfile(user)}>{user.name}</button>)}</div>}{dates.length === 0 ? <div className="page-empty history-empty"><History aria-hidden="true" /><h2>История пока пуста</h2><p>Добавленные дни появятся здесь.</p><button className="primary" onClick={goToday}>Перейти к сегодня</button></div> : <div className="history-list">{dates.map(itemDate => {
      const totals = sum(data.entries.filter(e => e.userId === profile.id && e.date === itemDate)); const goal = getGoal(data.goals, profile.id, itemDate)
      return <button key={itemDate} onClick={() => setDate(itemDate)}><CalendarDays aria-hidden="true" /><span><strong>{prettyDate(itemDate)}</strong><small>{round(totals.calories)} из {goal.calories} ккал</small></span><div className="mini-progress"><i style={{ width: `${Math.min(100, goal.calories ? totals.calories / goal.calories * 100 : 0)}%` }} /></div><ChevronRight aria-hidden="true" /></button>
    })}</div>}</>}
  </>
}

const normalizedFoodName = value => String(value || '').toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const closeFoodName = (left, right) => {
  const a = normalizedFoodName(left); const b = normalizedFoodName(right)
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const aWords = new Set(a.split(' ')); const bWords = new Set(b.split(' ')); const common = [...aWords].filter(word => bWords.has(word)).length
  return common / Math.max(aWords.size, bWords.size) >= 0.7
}
const closeNutrition = (left, right) => Math.abs(Number(left.calories) - Number(right.calories)) <= 25 && Math.abs(Number(left.protein) - Number(right.protein)) <= 4 && Math.abs(Number(left.fat) - Number(right.fat)) <= 4 && Math.abs(Number(left.carbs) - Number(right.carbs)) <= 6
const productKind = food => food.sourceType === 'recipe' ? 'Рецепт' : food.type === 'dish' ? 'Блюдо' : 'Продукт'

function ProductsPage({ viewer, data, update, notify }) {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('Все'); const [typeFilter, setTypeFilter] = useState('all'); const [sort, setSort] = useState('default'); const [modal, setModal] = useState(null); const [bulkMode, setBulkMode] = useState(false); const [selectedIds, setSelectedIds] = useState(() => new Set())
  const visibleByType = food => typeFilter === 'all' || (typeFilter === 'product' && food.type === 'product') || (typeFilter === 'dish' && food.type === 'dish' && food.sourceType !== 'recipe') || (typeFilter === 'recipe' && food.sourceType === 'recipe') || (typeFilter === 'favorite' && food.favorite) || (typeFilter === 'archived' && food.archived)
  const filteredFoods = data.foods.filter(food => (typeFilter === 'archived' ? food.archived : !food.archived) && visibleByType(food) && matchesFoodSearch(food, query) && (category === 'Все' || food.category === category))
  const foods = [...filteredFoods].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'ru')
    if (sort === 'frequent') return Number(b.usageCount || 0) - Number(a.usageCount || 0) || a.name.localeCompare(b.name, 'ru')
    if (sort === 'recent') return String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || a.name.localeCompare(b.name, 'ru')
    if (sort === 'favorites') return Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'ru')
    return Number(b.favorite) - Number(a.favorite) || Number(b.usageCount || 0) - Number(a.usageCount || 0) || a.name.localeCompare(b.name, 'ru')
  })
  const filtersActive = Boolean(query.trim()) || category !== 'Все' || typeFilter !== 'all' || sort !== 'default'
  const activeFoods = data.foods.filter(f => !f.archived)
  const save = food => { update(d => ({ ...d, foods: [...d.foods, food] })); setModal(null); notify(food.type === 'dish' ? 'Блюдо сохранено' : 'Продукт сохранён') }
  const saveRecipe = (food, ingredients) => {
    const editing = data.foods.some(item => item.id === food.id)
    update(d => ({
      ...d,
      foods: editing ? d.foods.map(item => item.id === food.id ? food : item) : [...d.foods, food],
      recipeIngredients: [...d.recipeIngredients.filter(item => item.recipeFoodItemId !== food.id), ...ingredients],
    }))
    setModal(null); notify(editing ? 'Рецепт обновлён. Старые записи дневника не изменились.' : 'Блюдо сохранено')
  }
  const archive = food => {
    if (!window.confirm(`Архивировать «${food.name}»? Старые записи в дневнике сохранятся.`)) return
    update(d => ({ ...d, foods: d.foods.map(x => x.id === food.id ? { ...x, archived: true } : x) })); notify('Продукт архивирован')
  }
  const restore = food => { update(d => ({ ...d, foods: d.foods.map(x => x.id === food.id ? { ...x, archived: false } : x) })); notify('Продукт возвращён из архива') }
  const toggleSelected = id => setSelectedIds(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const leaveBulk = () => { setBulkMode(false); setSelectedIds(new Set()) }
  const bulkUpdate = action => {
    const ids = [...selectedIds]; if (!ids.length) return
    const text = action === 'archive' ? 'архивировать' : 'снять из избранного у'
    if (!window.confirm(`${text[0].toUpperCase()}${text.slice(1)} ${ids.length} ${ids.length === 1 ? 'продукта' : 'продуктов'}? Старые записи дневника сохранятся.`)) return
    update(current => ({ ...current, foods: current.foods.map(food => ids.includes(food.id) ? { ...food, ...(action === 'archive' ? { archived: true } : { favorite: false }) } : food) }))
    leaveBulk(); notify(action === 'archive' ? 'Выбранные продукты архивированы' : 'Избранное обновлено')
  }
  const duplicatePairs = data.foods.filter(food => !food.archived).flatMap((food, index, all) => all.slice(index + 1).filter(other => !other.archived && food.category === other.category && closeFoodName(food.name, other.name) && closeNutrition(food, other)).map(other => [food, other]))
  return <><PageHead eyebrow="БАЗА" title="Продукты" subtitle={`${activeFoods.length} продуктов и блюд`} />
    <div className="search"><Search aria-hidden="true" /><input aria-label="Поиск по продуктам" value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по продуктам" /></div>
    <div className="product-type-filters" role="group" aria-label="Тип базы">{[['all', 'Все'], ['product', 'Продукты'], ['dish', 'Блюда'], ['recipe', 'Рецепты'], ['favorite', 'Избранные'], ['archived', 'Архивные']].map(([key, label]) => <button key={key} className={typeFilter === key ? 'active' : ''} aria-pressed={typeFilter === key} onClick={() => { setTypeFilter(key); leaveBulk() }}>{label}</button>)}</div>
    <div className="product-filter-controls"><label>Категория<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label><label>Сортировка<select value={sort} onChange={e => setSort(e.target.value)}><option value="default">Избранные → частые</option><option value="name">По названию</option><option value="frequent">Часто используемые</option><option value="recent">Недавно добавленные</option><option value="favorites">Избранные сверху</option></select></label></div>
    <div className="product-actions"><button className="primary" onClick={() => setModal({ type: 'product' })}><Plus aria-hidden="true" />Продукт</button><button className="secondary" onClick={() => setModal({ type: 'dish' })}><Plus aria-hidden="true" />Простое блюдо</button><button className="secondary recipe-create" onClick={() => setModal({ type: 'recipe' })}><CookingPot aria-hidden="true" />Из ингредиентов</button></div>
    <div className="bulk-mode-bar"><span>{bulkMode ? `Выбрано: ${selectedIds.size}` : 'Для нескольких продуктов'}</span><button className="secondary" onClick={() => bulkMode ? leaveBulk() : setBulkMode(true)}>{bulkMode ? 'Готово' : 'Выбрать'}</button></div>{bulkMode && <div className="bulk-actions"><button className="danger" disabled={selectedIds.size === 0} onClick={() => bulkUpdate('archive')}><Archive aria-hidden="true" />Архивировать</button><button className="secondary" disabled={selectedIds.size === 0} onClick={() => bulkUpdate('unfavorite')}><Star aria-hidden="true" />Снять из избранного</button></div>}
    {duplicatePairs.length > 0 && <section className="duplicate-warning" aria-labelledby="duplicate-title"><div><span className="section-label">ПРОВЕРКА БАЗЫ</span><h2 id="duplicate-title">Возможные дубли</h2></div><p>Похожее название, категория и КБЖУ — проверьте вручную перед архивированием.</p><div>{duplicatePairs.slice(0, 4).map(([first, second]) => <span key={`${first.id}:${second.id}`}>{first.name} ↔ {second.name}</span>)}</div></section>}
    {foods.length > 0 ? <div className="product-list">{foods.map(f => <article key={f.id} className={f.archived ? 'archived-product' : ''}>{bulkMode ? <button className={`product-select ${selectedIds.has(f.id) ? 'active' : ''}`} aria-label={`${selectedIds.has(f.id) ? 'Снять выбор' : 'Выбрать'} ${f.name}`} aria-pressed={selectedIds.has(f.id)} onClick={() => toggleSelected(f.id)}>{selectedIds.has(f.id) && <CheckCircle2 aria-hidden="true" />}</button> : <button className="star-button" aria-label={f.favorite ? 'Убрать из любимых' : 'Добавить в любимые'} aria-pressed={f.favorite} onClick={() => update(d => ({ ...d, foods: d.foods.map(x => x.id === f.id ? { ...x, favorite: !x.favorite } : x) }))}><Star className={f.favorite ? 'filled' : ''} /></button>}<div><strong>{f.name}</strong><span>{productKind(f)} · {f.category}{f.archived ? ' · архивный' : ''}</span><small>На 100 {f.baseUnit === 'ml' ? 'мл' : 'г'}: {f.calories} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}</small><small>Меры: {[{ label: UNIT_LABELS[f.baseUnit] || f.baseUnit }, ...(f.measures || [])].map(item => item.label).join(', ') || 'нет'} · {f.usageCount || 0} раз</small></div><div className="product-item-actions">{f.sourceType === 'recipe' && <button aria-label={`Изменить рецепт ${f.name}`} onClick={() => setModal({ type: 'recipe', food: f })}><Pencil /></button>}<button className="archive-button" aria-label={f.archived ? `Вернуть из архива ${f.name}` : `Архивировать ${f.name}`} onClick={() => f.archived ? restore(f) : archive(f)}>{f.archived ? <CheckCircle2 /> : <Archive />}</button></div></article>)}</div> : <div className="page-empty products-empty"><PackageOpen aria-hidden="true" /><h2>{activeFoods.length === 0 ? 'База продуктов пуста' : 'Ничего не нашли'}</h2><p>{activeFoods.length === 0 ? 'Создайте первый продукт или блюдо.' : 'Измените запрос или сбросьте фильтры.'}</p>{filtersActive && <button className="secondary" onClick={() => { setQuery(''); setCategory('Все'); setTypeFilter('all'); setSort('default') }}>Сбросить фильтры</button>}</div>}
    {modal?.type === 'recipe' ? <RecipeModal foods={data.foods} initial={modal.food || null} initialIngredients={data.recipeIngredients.filter(item => item.recipeFoodItemId === modal.food?.id)} currentUser={viewer} onClose={() => setModal(null)} onSave={saveRecipe} /> : modal && <ProductModal type={modal.type} currentUser={viewer} onClose={() => setModal(null)} onSave={save} />}
  </>
}

function WeightModal({ initial, profile, existingDates, onClose, onSave }) {
  const [date, setDate] = useState(initial?.date || todayISO())
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [note, setNote] = useState(initial?.note || '')
  const [touched, setTouched] = useState(false)
  const value = Number(weight)
  const invalid = weight === '' || !Number.isFinite(value) || value <= 0 || value > 500
  const willReplace = existingDates.includes(date) && date !== initial?.date
  const submit = event => {
    event.preventDefault(); setTouched(true)
    if (invalid) return
    const now = new Date().toISOString()
    onSave({ id: initial?.id || crypto.randomUUID(), userId: profile.id, date, weight: value, note: note.trim(), createdAt: initial?.createdAt || now, updatedAt: now })
  }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="sheet weight-sheet" role="dialog" aria-modal="true" aria-labelledby="weight-modal-title">
    <header><div><span className="section-label">ВЕС · {profile.name.toUpperCase()}</span><h2 id="weight-modal-title">{initial ? 'Изменить запись' : 'Добавить вес'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X /></button></header>
    <form onSubmit={submit}>
      <label htmlFor="weight-date">Дата<input id="weight-date" type="date" max={todayISO()} value={date} onInput={event => setDate(event.currentTarget.value)} onChange={event => setDate(event.currentTarget.value)} /></label>
      <label htmlFor="weight-value">Вес, кг<input id="weight-value" autoFocus type="number" inputMode="decimal" min="20" max="500" step="0.1" placeholder="Например, 118.4" value={weight} onBlur={() => setTouched(true)} onChange={event => { setWeight(event.target.value); setTouched(true) }} aria-invalid={touched && invalid} aria-describedby="weight-error" /></label>
      <div id="weight-error" className="field-error" role="alert">{touched && invalid ? 'Введите вес от 20 до 500 кг.' : ''}</div>
      {willReplace && <div className="replace-hint">На эту дату уже есть запись. Перед заменой попросим подтверждение.</div>}
      <label htmlFor="weight-note">Комментарий<textarea id="weight-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Например, утром натощак" /></label>
      <button className="primary wide" disabled={invalid}>{initial ? 'Сохранить изменения' : 'Добавить вес'}</button>
    </form>
  </section></div>
}

function WeightChart({ entries }) {
  if (entries.length < 2) return <div className="chart-empty"><Scale aria-hidden="true" /><strong>Недостаточно данных для графика</strong><span>Добавьте минимум две записи в выбранном периоде.</span></div>
  const width = 360; const height = 190; const left = 38; const right = 12; const top = 18; const bottom = 30
  const dates = entries.map(entry => new Date(`${entry.date}T12:00:00`).getTime())
  const weights = entries.map(entry => Number(entry.weight))
  const minDate = Math.min(...dates); const maxDate = Math.max(...dates)
  const rawMin = Math.min(...weights); const rawMax = Math.max(...weights); const spread = Math.max(rawMax - rawMin, 1)
  const minWeight = rawMin - spread * .2; const maxWeight = rawMax + spread * .2
  const x = value => left + ((value - minDate) / (maxDate - minDate)) * (width - left - right)
  const y = value => top + ((maxWeight - value) / (maxWeight - minWeight)) * (height - top - bottom)
  const points = entries.map((entry, index) => `${x(dates[index])},${y(weights[index])}`).join(' ')
  const dateLabel = iso => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(`${iso}T12:00:00`))
  return <div className="weight-chart-wrap">
    <svg className="weight-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`График веса: от ${weights[0]} до ${weights.at(-1)} килограмма, точек: ${entries.length}`}>
      {[0, .5, 1].map(ratio => {
        const lineY = top + ratio * (height - top - bottom); const label = maxWeight - ratio * (maxWeight - minWeight)
        return <g key={ratio}><line x1={left} x2={width - right} y1={lineY} y2={lineY} className="chart-grid-line" /><text x={left - 6} y={lineY + 3} textAnchor="end" className="chart-axis-label">{round(label)}</text></g>
      })}
      <polyline points={points} className="chart-line" />
      {entries.map((entry, index) => <circle key={entry.id} cx={x(dates[index])} cy={y(weights[index])} r="5" className="chart-point"><title>{dateLabel(entry.date)} · {entry.weight} кг</title></circle>)}
      <text x={left} y={height - 8} className="chart-axis-label">{dateLabel(entries[0].date)}</text>
      <text x={width - right} y={height - 8} textAnchor="end" className="chart-axis-label">{dateLabel(entries.at(-1).date)}</text>
    </svg>
  </div>
}

function ChangeValue({ change }) {
  if (!change) return <span className="insufficient">Недостаточно данных</span>
  const value = round(change.value)
  return <><strong className={value < 0 ? 'weight-down' : value > 0 ? 'weight-up' : ''}>{value > 0 ? '+' : ''}{value} кг</strong><small>от {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${change.baseline.date}T12:00:00`)).replace('.', '')}</small></>
}

function weightEntryWord(count) {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'записей'
  if (mod10 === 1) return 'запись'
  if (mod10 >= 2 && mod10 <= 4) return 'записи'
  return 'записей'
}

function WeightGoalCard({ progress }) {
  if (!progress) return <section className="weight-goal-card"><span className="section-label">ЦЕЛЬ ВЕСА</span><h2>Цель пока не задана</h2><p>Её можно настроить в разделе «Настройки».</p></section>
  if (progress.current === null) return <section className="weight-goal-card"><span className="section-label">ЦЕЛЬ ВЕСА</span><h2>Цель: {round(progress.goal.targetWeight)} кг</h2><p>{progress.assessment}</p></section>
  const weeks = Math.max(1, Math.ceil(progress.weeks))
  return <section className="weight-goal-card" aria-label="Прогресс к цели веса"><div className="weight-goal-head"><div><span className="section-label">ЦЕЛЬ ВЕСА</span><h2>{round(progress.goal.targetWeight)} кг</h2></div><span>{progress.pace.label}</span></div><div className="weight-goal-grid"><div><span>Сейчас</span><strong>{round(progress.current)} кг</strong></div><div><span>Осталось</span><strong>{round(progress.remaining)} кг</strong></div></div><div className="goal-progress" role="progressbar" aria-label="Примерный прогресс к цели веса" aria-valuemin="0" aria-valuemax="100" aria-valuenow={round(progress.percent)}><i style={{ width: `${progress.percent}%` }} /></div><div className="weight-goal-footer"><span>Примерный прогресс: {round(progress.percent)}%</span><span>Ориентир: ~{weeks} нед.</span></div><p>{progress.assessment}</p></section>
}

function WeightPage({ viewer, profile, setProfile, data, update, notify }) {
  const [period, setPeriod] = useState('30')
  const [modal, setModal] = useState(null)
  const stats = getWeightStats(data.weightEntries, profile.id)
  const chartEntries = filterWeightPeriod(stats.records, period)
  const goalProgress = getWeightGoalProgress(getWeightGoal(data.weightGoals, profile.id), data.weightEntries, profile.id)
  const save = entry => {
    const duplicate = data.weightEntries.find(item => item.userId === profile.id && item.date === entry.date && item.id !== entry.id)
    if (duplicate && !window.confirm(`На ${new Date(`${entry.date}T12:00:00`).toLocaleDateString('ru-RU')} уже есть запись ${duplicate.weight} кг. Заменить её?`)) return
    const editing = Boolean(modal?.entry || duplicate)
    const nextEntry = duplicate ? { ...entry, id: duplicate.id, createdAt: duplicate.createdAt } : entry
    update(current => ({ ...current, weightEntries: [...current.weightEntries.filter(item => item.id !== entry.id && item.id !== duplicate?.id), nextEntry] }))
    setModal(null); notify(editing ? 'Вес обновлён' : 'Вес добавлен')
  }
  const remove = entry => {
    if (!window.confirm(`Удалить запись ${entry.weight} кг за ${new Date(`${entry.date}T12:00:00`).toLocaleDateString('ru-RU')}?`)) return
    update(current => ({ ...current, weightEntries: current.weightEntries.filter(item => item.id !== entry.id) })); notify('Запись веса удалена')
  }
  const existingDates = stats.records.map(entry => entry.date)
  return <>
    <PageHead eyebrow="ПРОГРЕСС" title="Вес" subtitle={`Динамика веса · ${profile.name}`} />
    {viewer.role === 'admin' && <div className="profile-switch compact weight-profile" aria-label="Профиль веса">{USERS.map(user => <button key={user.id} className={profile.id === user.id ? 'active' : ''} onClick={() => setProfile(user)}>{user.name}</button>)}</div>}
    {stats.latest ? <section className="weight-overview">
      <div className="latest-weight"><span className="section-label">ПОСЛЕДНИЙ ВЕС</span><strong>{stats.latest.weight} <small>кг</small></strong><span>{prettyDate(stats.latest.date)}</span></div>
      <div className="weight-stats">
        <div><span>За неделю</span><ChangeValue change={stats.weekChange} /></div>
        <div><span>За месяц</span><ChangeValue change={stats.monthChange} /></div>
        <div><span>Среднее недели</span>{stats.weekAverage === null ? <span className="insufficient">Недостаточно данных</span> : <><strong>{round(stats.weekAverage)} кг</strong><small>{stats.weekCount} {weightEntryWord(stats.weekCount)}</small></>}</div>
      </div>
    </section> : <div className="weight-empty"><Scale aria-hidden="true" /><h2>Записей веса пока нет</h2><p>Добавьте первое измерение, чтобы начать следить за динамикой.</p></div>}
    <WeightGoalCard progress={goalProgress} />
    <button className="primary wide add-weight-button" onClick={() => setModal({})}><Plus aria-hidden="true" />Добавить вес</button>
    <section className="weight-chart-card" aria-labelledby="weight-chart-title">
      <div className="weight-section-head"><div><span className="section-label">ДИНАМИКА</span><h2 id="weight-chart-title">График</h2></div><span>{chartEntries.length} {weightEntryWord(chartEntries.length)}</span></div>
      <div className="weight-periods" role="tablist" aria-label="Период графика">{[['7', '7 дней'], ['30', '30 дней'], ['all', 'Всё время']].map(([key, label]) => <button role="tab" aria-selected={period === key} className={period === key ? 'active' : ''} key={key} onClick={() => setPeriod(key)}>{label}</button>)}</div>
      <WeightChart entries={chartEntries} />
    </section>
    <section className="weight-list-card" aria-labelledby="weight-list-title">
      <div className="weight-section-head"><div><span className="section-label">ИСТОРИЯ</span><h2 id="weight-list-title">Записи</h2></div><span>{stats.records.length}</span></div>
      {stats.records.length ? <div className="weight-list">{[...stats.records].reverse().map(entry => <article key={entry.id}>
        <div className="weight-entry-main"><strong>{entry.weight} кг</strong><span>{prettyDate(entry.date)}</span>{entry.note && <p>{entry.note}</p>}</div>
        <div className="weight-entry-actions"><button aria-label={`Изменить вес за ${entry.date}`} onClick={() => setModal({ entry })}><Pencil /></button><button aria-label={`Удалить вес за ${entry.date}`} onClick={() => remove(entry)}><Trash2 /></button></div>
      </article>)}</div> : <div className="list-empty">Здесь появятся сохранённые измерения.</div>}
    </section>
    {modal && <WeightModal initial={modal.entry || null} profile={profile} existingDates={existingDates} onClose={() => setModal(null)} onSave={save} />}
  </>
}

function WeightGoalSettings({ viewer, data, update, notify }) {
  const initialProfileId = viewer.role === 'admin' ? 'danya' : viewer.id
  const [profileId, setProfileId] = useState(initialProfileId)
  const stats = getWeightStats(data.weightEntries, profileId)
  const existing = getWeightGoal(data.weightGoals, profileId)
  const [form, setForm] = useState(() => ({ targetWeight: existing?.targetWeight ?? '', pace: existing?.pace || 'normal', startDate: existing?.startDate || todayISO() }))
  const select = id => { setProfileId(id); const goal = getWeightGoal(data.weightGoals, id); setForm({ targetWeight: goal?.targetWeight ?? '', pace: goal?.pace || 'normal', startDate: goal?.startDate || todayISO() }) }
  const target = Number(form.targetWeight)
  const current = stats.latest ? Number(stats.latest.weight) : null
  const invalid = !current || !Number.isFinite(target) || target < 20 || target >= current || !form.startDate
  const save = event => {
    event.preventDefault()
    if (invalid) return
    const now = new Date().toISOString()
    update(state => ({ ...state, weightGoals: [...state.weightGoals.filter(goal => goal.userId !== profileId), { id: existing?.id || crypto.randomUUID(), userId: profileId, targetWeight: target, pace: form.pace, startDate: form.startDate, createdAt: existing?.createdAt || now, updatedAt: now }] }))
    notify('Цель веса сохранена')
  }
  return <section className="settings-card weight-goal-settings"><div className="card-title"><div><span className="section-label">ЦЕЛЬ ВЕСА</span><h2>План снижения веса</h2></div><Scale aria-hidden="true" /></div>{viewer.role === 'admin' && <div className="profile-switch compact">{USERS.map(user => <button key={user.id} className={profileId === user.id ? 'active' : ''} onClick={() => select(user.id)}>{user.name}</button>)}</div>}<p className="form-hint">Текущий вес: {current === null ? 'нет записи — сначала добавьте измерение' : `${round(current)} кг · ${prettyDate(stats.latest.date)}`}</p><form onSubmit={save}><label>Целевой вес, кг<input type="number" inputMode="decimal" min="20" max="500" step="0.1" value={form.targetWeight} onChange={event => setForm({ ...form, targetWeight: event.target.value })} placeholder="Например, 75" aria-invalid={Boolean(form.targetWeight) && invalid} aria-describedby="weight-goal-error" /></label><div id="weight-goal-error" className="field-error" role="alert">{!current ? 'Добавьте текущий вес, затем укажите цель.' : form.targetWeight && invalid ? 'Для плана снижения цель должна быть меньше текущего веса и не ниже 20 кг.' : ''}</div><label>Желаемый темп<select value={form.pace} onChange={event => setForm({ ...form, pace: event.target.value })}>{Object.entries(WEIGHT_PACES).map(([key, pace]) => <option key={key} value={key}>{pace.label}</option>)}</select></label><label>Дата начала<input type="date" max={todayISO()} value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} /></label><button className="primary wide" disabled={invalid}>Сохранить цель веса</button></form><p className="form-hint">Это ориентир для наблюдения за динамикой, а не медицинское назначение.</p></section>
}

const GOAL_REASONS = { reduce: 'Снижаем калории', plateau: 'Вес стоит', maintenance: 'Поддержание', other: 'Другое' }
function nutritionPlanHint(data, profileId) {
  const report = getNutritionAnalytics(data, profileId, '14')
  const weights = data.weightEntries.filter(item => item.userId === profileId && item.date >= shiftDate(todayISO(), -13) && item.date <= todayISO()).sort((a, b) => a.date.localeCompare(b.date))
  if (report.daysWithEntries < 5 || weights.length < 2) return 'Мало данных для рекомендации.'
  const change = Number(weights.at(-1).weight) - Number(weights[0].weight)
  const closeToPlan = report.plan.calories > 0 && Math.abs(report.calorieDifference / report.plan.calories) <= .05
  if (change <= -1.5) return 'Вес снижается быстро — лучше не снижать калории резко.'
  if (Math.abs(change) < .2 && closeToPlan) return 'Вес стоит, а калории близко к цели: можно подумать о небольшой корректировке.'
  return 'Текущий план выглядит стабильным.'
}

function NutritionPlanSettings({ viewer, data, update, notify }) {
  const [profileId, setProfileId] = useState('danya')
  const current = getGoal(data.goals, profileId, todayISO())
  const [form, setForm] = useState(() => ({ calories: current.calories || '', protein: current.protein || '', fat: current.fat || '', carbs: current.carbs || '', startDate: todayISO(), reason: '', comment: '' }))
  const select = id => { const goal = getGoal(data.goals, id, todayISO()); setProfileId(id); setForm({ calories: goal.calories || '', protein: goal.protein || '', fat: goal.fat || '', carbs: goal.carbs || '', startDate: todayISO(), reason: '', comment: '' }) }
  const invalid = !form.startDate || ['calories', 'protein', 'fat', 'carbs'].some(key => form[key] === '' || !Number.isFinite(Number(form[key])) || Number(form[key]) < 0)
  const history = data.goals.filter(goal => goal.userId === profileId).sort((a, b) => b.startDate.localeCompare(a.startDate))
  const save = event => {
    event.preventDefault()
    if (invalid) return
    const existing = data.goals.find(goal => goal.userId === profileId && goal.startDate === form.startDate)
    if (existing && !window.confirm(`Цель с ${new Date(`${form.startDate}T12:00:00`).toLocaleDateString('ru-RU')} уже есть. Обновить её?`)) return
    const goal = { id: existing?.id || crypto.randomUUID(), userId: profileId, calories: Number(form.calories), protein: Number(form.protein), fat: Number(form.fat), carbs: Number(form.carbs), startDate: form.startDate, reason: form.reason, comment: form.comment.trim(), createdBy: viewer.id, createdAt: existing?.createdAt || new Date().toISOString() }
    update(currentData => ({ ...currentData, goals: [...currentData.goals.filter(item => item.id !== goal.id), goal] }))
    notify(existing ? 'Цель КБЖУ обновлена' : 'Новая цель КБЖУ сохранена')
  }
  const displayUser = id => USERS.find(user => user.id === id)?.name || 'не указано'
  return <section className="settings-card nutrition-plan-settings"><div className="card-title"><div><span className="section-label">ПЛАН КБЖУ</span><h2>Цели и корректировки</h2></div><SlidersHorizontal aria-hidden="true" /></div><div className="profile-switch compact">{USERS.map(user => <button key={user.id} className={profileId === user.id ? 'active' : ''} onClick={() => select(user.id)}>{user.name}</button>)}</div><div className="nutrition-current"><span>Действует с {current.startDate ? new Date(`${current.startDate}T12:00:00`).toLocaleDateString('ru-RU') : '—'}</span><div><strong>{current.calories || '—'} <small>ккал</small></strong><strong>Б {current.protein || '—'}</strong><strong>Ж {current.fat || '—'}</strong><strong>У {current.carbs || '—'}</strong></div></div><p className="plan-adjustment-hint">{nutritionPlanHint(data, profileId)} Решение об изменении остаётся за вами.</p><form onSubmit={save}><label>Начать действие с даты<input type="date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} /></label><div className="nutrient-inputs">{[['calories', 'Ккал'], ['protein', 'Белки, г'], ['fat', 'Жиры, г'], ['carbs', 'Углеводы, г']].map(([key, label]) => <label key={key}>{label}<input type="number" inputMode="decimal" min="0" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} aria-invalid={Boolean(form[key]) && (!Number.isFinite(Number(form[key])) || Number(form[key]) < 0)} /></label>)}</div><label>Причина изменения<select value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })}><option value="">Не указывать</option>{Object.entries(GOAL_REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Комментарий<textarea value={form.comment} onChange={event => setForm({ ...form, comment: event.target.value })} placeholder="Необязательно" /></label><div className="field-error" role="alert">{invalid ? 'Укажите дату и неотрицательные значения КБЖУ.' : ''}</div><button className="primary wide" disabled={invalid}>Сохранить новую цель</button></form><p className="form-hint">Новая дата создаёт следующую цель; прошлые цели и дневники не удаляются.</p><div className="goal-history"><span className="section-label">ИСТОРИЯ ЦЕЛЕЙ</span>{history.map(goal => <article key={goal.id}><div><strong>{new Date(`${goal.startDate}T12:00:00`).toLocaleDateString('ru-RU')}</strong><span>{goal.calories} ккал · Б {goal.protein} · Ж {goal.fat} · У {goal.carbs}</span>{(goal.reason || goal.comment) && <small>{goal.reason ? GOAL_REASONS[goal.reason] || goal.reason : ''}{goal.reason && goal.comment ? ' · ' : ''}{goal.comment}</small>}</div><small>Изменил: {displayUser(goal.createdBy)}</small></article>)}</div></section>
}

function HabitModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [visibility, setVisibility] = useState(initial?.visibility || 'both')
  const [weekdays, setWeekdays] = useState(initial?.weekdays || WEEKDAYS.map(([key]) => key))
  const clean = name.trim()
  const toggleDay = key => setWeekdays(current => current.includes(key) ? current.filter(day => day !== key) : [...current, key])
  const submit = event => { event.preventDefault(); if (clean && weekdays.length) onSave({ name: clean, visibility, weekdays }) }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="sheet habit-sheet" role="dialog" aria-modal="true" aria-labelledby="habit-modal-title"><header><div><span className="section-label">ПРИВЫЧКА</span><h2 id="habit-modal-title">{initial ? 'Изменить привычку' : 'Новая привычка'}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X /></button></header><form onSubmit={submit}><label>Название<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Например, прогулка 20 минут" /></label><label>Кто видит<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="danya">Даня</option><option value="vika">Вика</option><option value="both">Оба</option></select></label><fieldset className="habit-days"><legend>Дни недели</legend><div>{WEEKDAYS.map(([key, label]) => <button type="button" key={key} className={weekdays.includes(key) ? 'active' : ''} aria-pressed={weekdays.includes(key)} onClick={() => toggleDay(key)}>{label}</button>)}</div></fieldset><div className="field-error" role="alert">{!clean || !weekdays.length ? 'Укажите название и хотя бы один день.' : ''}</div><button className="primary wide" disabled={!clean || !weekdays.length}>{initial ? 'Сохранить привычку' : 'Создать привычку'}</button></form></section></div>
}

function HabitSettings({ data, update, notify }) {
  const [modal, setModal] = useState(null)
  const habits = [...data.habitItems].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'ru'))
  const save = values => {
    const existing = modal?.habit; const timestamp = new Date().toISOString()
    const habit = { id: existing?.id || crypto.randomUUID(), ...values, isActive: existing?.isActive ?? true, createdBy: 'danya', createdAt: existing?.createdAt || timestamp, updatedAt: timestamp }
    update(current => ({ ...current, habitItems: existing ? current.habitItems.map(item => item.id === habit.id ? habit : item) : [...current.habitItems, habit] }))
    setModal(null); notify(existing ? 'Привычка обновлена' : 'Привычка создана')
  }
  const archive = habit => { if (!window.confirm(`${habit.isActive ? 'Архивировать' : 'Вернуть'} привычку «${habit.name}»?`)) return; update(current => ({ ...current, habitItems: current.habitItems.map(item => item.id === habit.id ? { ...item, isActive: !item.isActive, updatedAt: new Date().toISOString() } : item) })); notify(habit.isActive ? 'Привычка архивирована' : 'Привычка восстановлена') }
  const audience = value => value === 'both' ? 'Оба' : value === 'danya' ? 'Даня' : 'Вика'
  return <section className="settings-card habit-settings" aria-labelledby="habit-settings-title"><div className="card-title"><div><span className="section-label">ПРИВЫЧКИ</span><h2 id="habit-settings-title">Ежедневный чеклист</h2></div><CheckCircle2 aria-hidden="true" /></div><p className="form-hint">Даня управляет привычками для себя, Вики или обоих. Каждый отмечает только свои выполнения.</p><button className="secondary wide" onClick={() => setModal({})}><Plus aria-hidden="true" />Добавить привычку</button>{habits.length ? <div className="habit-settings-list">{habits.map(habit => <article key={habit.id} className={habit.isActive ? '' : 'archived'}><div><strong>{habit.name}</strong><span>{audience(habit.visibility)} · {habit.weekdays.map(day => WEEKDAYS.find(([key]) => key === day)?.[1]).filter(Boolean).join(', ')}</span></div><div><button aria-label={`Изменить привычку ${habit.name}`} onClick={() => setModal({ habit })}><Pencil /></button><button aria-label={`${habit.isActive ? 'Архивировать' : 'Восстановить'} привычку ${habit.name}`} onClick={() => archive(habit)}>{habit.isActive ? <Archive /> : <CheckCircle2 />}</button></div></article>)}</div> : <p className="insight-empty">Добавьте лёгкую привычку, если она помогает помнить о важном.</p>}{modal && <HabitModal initial={modal.habit || null} onClose={() => setModal(null)} onSave={save} />}</section>
}

function SettingsPage({ viewer, data, update, onLogout, notify, hasLocalMigration, migrateLocalData, dismissLocalMigration }) {
  return <><PageHead eyebrow="ПРОФИЛЬ" title="Настройки" subtitle={`Вы вошли как ${viewer.name}`} />{viewer.role === 'admin' && <NutritionPlanSettings viewer={viewer} data={data} update={update} notify={notify} />}
    <WeightGoalSettings viewer={viewer} data={data} update={update} notify={notify} />
    {viewer.role === 'admin' && <HabitSettings data={data} update={update} notify={notify} />}
    {viewer.role === 'admin' && <MealTemplatesSettings data={data} update={update} notify={notify} />}
    <PhraseSettings viewer={viewer} data={data} update={update} notify={notify} />
    {viewer.id === 'vika' && <TomorrowMessageSettings data={data} update={update} notify={notify} />}
    {viewer.role === 'admin' && <BackupSettings data={data} update={update} notify={notify} hasLocalMigration={hasLocalMigration} migrateLocalData={migrateLocalData} dismissLocalMigration={dismissLocalMigration} />}
    <section className="settings-card"><div className="card-title"><div><span className="section-label">УСТРОЙСТВО</span><h2>Сеанс</h2></div><CircleUserRound aria-hidden="true" /></div><button className="danger wide" onClick={onLogout}><LogOut aria-hidden="true" />Выйти на этом устройстве</button></section>
  </>
}

function PageHead({ eyebrow, title, subtitle }) { return <header className="page-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header> }

function BottomNav({ viewer, page, setPage }) {
  const links = [['today', Clock3, 'Сегодня'], ['history', History, 'Отчёты'], ['weight', Scale, 'Вес'], ...(viewer.id === 'danya' ? [['workouts', Dumbbell, 'Тренировки'], ['products', Apple, 'Продукты']] : []), ['settings', Settings, 'Настройки']]
  return <nav className="bottom-nav" aria-label="Основная навигация">{links.map(([key, Icon, label]) => <button key={key} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined} onClick={() => setPage(key)}><Icon aria-hidden="true" /><span>{label}</span></button>)}</nav>
}

export default function App() {
  const [viewer, setViewer] = useState(() => {
    const session = storage.session?.() || (!navigator.onLine ? storage.offlineSession?.() : null)
    return session ? (USERS.find(user => user.id === session.id) || { id: session.id, name: session.name, role: session.role }) : null
  })
  const [profile, setProfile] = useState(viewer || USERS[0]); const [page, setPage] = useState('today'); const [date, setDate] = useState(todayISO())
  const [toast, setToast] = useState(''); const toastTimer = useRef(null)
  const notify = message => { clearTimeout(toastTimer.current); setToast(message); toastTimer.current = setTimeout(() => setToast(''), 2600) }
  const { data, update, loading, error: storageError, errorTitle, mode, status, syncState, isOffline, hasOfflineSnapshot, reload, hasLocalMigration, migrateLocalData, dismissLocalMigration } = useStore({ onError: notify })
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  if (!viewer) return <Login offline={isOffline} hasOfflineSnapshot={hasOfflineSnapshot} onLogin={user => { setViewer(user); setProfile(user); reload() }} />
  const gotoDate = value => { setDate(value); setPage('today') }
  const logout = () => { storage.logout(); setPage('today'); setDate(todayISO()); setViewer(null) }
  if (loading) return <main className="loading-shell" role="status" aria-live="polite"><div className="brand-mark"><Apple aria-hidden="true" /></div><strong>Загружаем семейный дневник…</strong><span>Проверяем синхронизацию данных.</span></main>
  return <div className="desktop-bg"><main className="app-shell"><div className="scroll-area">
    <div className={`storage-status ${mode} ${syncState}`} role="status">{status}</div>
    {isOffline && <section className="offline-notice" role="status" aria-live="polite"><strong>{hasOfflineSnapshot ? 'Показан последний локальный снимок' : 'Нет сохранённого снимка'}</strong><span>{hasOfflineSnapshot ? 'Интернет недоступен. Просмотр работает, а изменения временно заблокированы — синхронизация не обещается.' : 'Откройте приложение онлайн хотя бы один раз, чтобы сохранить данные для офлайн-просмотра.'}</span><button className="secondary" onClick={reload}>Проверить соединение</button></section>}
    {storageError && <section className="sync-error" role="alert"><strong>{errorTitle}</strong><span>{storageError}</span><button className="secondary" onClick={reload}>Повторить</button></section>}
    <fieldset className="offline-readonly" disabled={isOffline} aria-label={isOffline ? 'Данные доступны только для просмотра' : undefined}>
      {page === 'today' && <Today viewer={viewer} profile={profile} setProfile={setProfile} data={data} update={update} date={date} setDate={setDate} notify={notify} />}
      {page === 'history' && <HistoryPage viewer={viewer} profile={profile} setProfile={setProfile} data={data} setDate={gotoDate} goToday={() => gotoDate(todayISO())} />}
      {page === 'weight' && <WeightPage viewer={viewer} profile={profile} setProfile={setProfile} data={data} update={update} notify={notify} />}
      {page === 'workouts' && viewer.id === 'danya' && <WorkoutPage viewer={viewer} data={data} update={update} notify={notify} />}
      {page === 'products' && viewer.role === 'admin' && <ProductsPage viewer={viewer} data={data} update={update} notify={notify} />}
      {page === 'settings' && <SettingsPage viewer={viewer} data={data} update={update} onLogout={logout} notify={notify} hasLocalMigration={hasLocalMigration} migrateLocalData={migrateLocalData} dismissLocalMigration={dismissLocalMigration} />}
    </fieldset>
  </div><BottomNav viewer={viewer} page={page} setPage={setPage} /><Toast message={toast} /></main></div>
}
