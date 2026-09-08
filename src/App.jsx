import { useEffect, useRef, useState } from 'react'
import {
  Apple, Archive, CalendarDays, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, CircleUserRound,
  Clock3, CookingPot, FileQuestion, Flame, History, LogOut, MessageSquareText, PackageOpen,
  PackagePlus, Pencil, Plus, Search, Settings, SlidersHorizontal, Star, Trash2, Utensils, X,
} from 'lucide-react'
import { CATEGORIES, MEALS, UNIT_LABELS, USERS, calculate, formatWeekRange, getGoal, getWeekReport, getWeekStart, prettyDate, shiftDate, todayISO } from './data'
import { useStore } from './useStore'

const round = n => Math.round((Number(n) || 0) * 10) / 10
const sum = rows => rows.reduce((a, e) => ({
  calories: a.calories + Number(e.calories || 0), protein: a.protein + Number(e.protein || 0),
  fat: a.fat + Number(e.fat || 0), carbs: a.carbs + Number(e.carbs || 0),
}), { calories: 0, protein: 0, fat: 0, carbs: 0 })

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function Toast({ message }) {
  return <div className={`toast ${message ? 'show' : ''}`} role="status" aria-live="polite">
    <CheckCircle2 aria-hidden="true" /><span>{message}</span>
  </div>
}

function Login({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true)
    const hash = await sha256(pin); const user = USERS.find(u => u.pinHash === hash)
    setBusy(false)
    if (!user) { setError('Неверный PIN. Попробуйте ещё раз.'); setPin(''); return }
    localStorage.setItem('pff-session', user.id); onLogin(user)
  }
  return <main className="login-shell"><section className="login-card">
    <div className="brand-mark"><Apple size={28} aria-hidden="true" /></div>
    <p className="eyebrow">PANK FAMILY FIT</p><h1>Ваш дневник питания</h1>
    <p className="muted">Спокойно следим за КБЖУ — без лишнего шума.</p>
    <form onSubmit={submit}>
      <label htmlFor="pin">Введите PIN</label>
      <input id="pin" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength="5" value={pin}
        onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }} className="pin-input"
        placeholder="•••••" aria-invalid={!!error} aria-describedby="pin-error" />
      <div id="pin-error" className="field-error" role="alert">{error}</div>
      <button className="primary wide" disabled={pin.length !== 5 || busy}>{busy ? 'Проверяем…' : 'Войти'}</button>
    </form>
    <p className="privacy">PIN проверяется только в защищённом виде. Устройство запомнит вход.</p>
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
  const visibleFoods = foods.filter(f => !f.archived && f.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7)
  const amountNumber = Number(amount); const amountInvalid = amount === '' || !Number.isFinite(amountNumber) || amountNumber <= 0
  const available = selected ? [{ unit: selected.baseUnit, label: UNIT_LABELS[selected.baseUnit] }, ...(selected.measures || [])] : []
  const calc = selected && !amountInvalid ? calculate(selected, amountNumber, unit) : null
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
        {visibleFoods.length > 0 ? <div className="food-results">{visibleFoods.map(f => <button type="button" key={f.id} onClick={() => choose(f)}>
          <div className="food-icon"><Utensils aria-hidden="true" /></div><span><strong>{f.name}</strong><small>{f.calories} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}</small></span><ChevronRight aria-hidden="true" />
        </button>)}</div> : <div className="compact-empty"><Search aria-hidden="true" /><strong>{query ? 'Ничего не нашли' : 'База продуктов пуста'}</strong><span>{query ? 'Попробуйте другое название.' : 'Создайте первый продукт.'}</span></div>}
        <button type="button" className="secondary wide" onClick={() => onCreate({ meal, date })}><PackagePlus aria-hidden="true" />Создать продукт</button>
        <button className="primary wide" disabled>Сначала выберите продукт</button>
      </> : <>
        <button type="button" className="selected-food" onClick={() => setSelected(null)}><span><small>Продукт</small><strong>{selected.name}</strong></span><span>Изменить</span></button>
        <div className="form-grid"><label htmlFor="food-amount">Количество<input id="food-amount" type="number" min="0.1" step="0.1" value={amount}
          onBlur={() => setAmountTouched(true)} onChange={e => { setAmount(e.target.value); setAmountTouched(true) }} aria-invalid={amountTouched && amountInvalid} aria-describedby="amount-error" /></label>
          <label>Единица<select value={unit} onChange={e => setUnit(e.target.value)}>{available.map(m => <option key={m.unit} value={m.unit}>{m.label}</option>)}</select></label></div>
        <div id="amount-error" className="field-error" role="alert">{amountTouched && amountInvalid ? 'Укажите количество больше нуля.' : ''}</div>
        <div className="form-grid"><label>Приём пищи<select value={meal} onChange={e => setMeal(e.target.value)}>{Object.entries(MEALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Дата<input type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} /></label></div>
        <div className={`calculation ${!calc ? 'invalid' : ''}`} aria-live="polite"><span><strong>{calc ? round(calc.calories) : '—'}</strong> ккал</span><span>Б <strong>{calc ? round(calc.protein) : '—'}</strong></span><span>Ж <strong>{calc ? round(calc.fat) : '—'}</strong></span><span>У <strong>{calc ? round(calc.carbs) : '—'}</strong></span></div>
        <button className="primary wide" disabled={amountInvalid}>{initial ? 'Сохранить изменения' : 'Добавить в дневник'}</button>
      </>}</form>
    </section>
  </div>
}

function ProductModal({ type = 'product', onClose, onSave }) {
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
    return { ...f, measures: [...f.measures, { unit: unitName, label: `1 ${UNIT_LABELS[unitName]}`, amountInBase: 1 }] }
  })
  const measureField = (index, key, val) => setForm(f => ({ ...f, measures: f.measures.map((m, i) => i === index ? { ...m, [key]: val } : m) }))
  const submit = e => {
    e.preventDefault()
    onSave({ ...form, id: crypto.randomUUID(), baseAmount: Number(form.baseAmount), calories: Number(form.calories), protein: Number(form.protein), fat: Number(form.fat), carbs: Number(form.carbs), favorite: false, archived: false, usageCount: 0, measures: form.measures.map(m => ({ ...m, amountInBase: Number(m.amountInBase) })) })
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

function Today({ viewer, profile, setProfile, data, update, date, setDate, notify }) {
  const [meal, setMeal] = useState('breakfast'); const [modal, setModal] = useState(null); const [creating, setCreating] = useState(null)
  const dayEntries = data.entries.filter(e => e.userId === profile.id && e.date === date); const mealEntries = dayEntries.filter(e => e.mealType === meal)
  const total = sum(dayEntries); const mealTotal = sum(mealEntries); const goal = getGoal(data.goals, profile.id, date); const noteKey = `${profile.id}:${date}`
  const note = data.notes[noteKey] || ''; const dayIsEmpty = dayEntries.length === 0 && !note
  const saveEntry = entry => {
    const editing = Boolean(modal?.entry)
    update(d => ({ ...d, entries: [...d.entries.filter(e => e.id !== entry.id), { ...entry, userId: profile.id }], foods: d.foods.map(f => f.id === entry.foodItemId ? { ...f, usageCount: (f.usageCount || 0) + (editing ? 0 : 1) } : f) }))
    setMeal(entry.mealType); setModal(null); notify(editing ? 'Запись обновлена' : 'Еда добавлена')
  }
  const remove = id => {
    if (window.confirm('Удалить эту запись из дневника?')) { update(d => ({ ...d, entries: d.entries.filter(e => e.id !== id) })); notify('Запись удалена') }
  }
  const createFood = food => {
    update(d => ({ ...d, foods: [...d.foods, food] })); const context = creating
    setCreating(null); setModal({ meal: context?.meal || meal, date: context?.date || date }); notify('Продукт сохранён')
  }
  const saveNote = value => { update(d => ({ ...d, notes: { ...d.notes, [noteKey]: value } })); notify('Комментарий сохранён') }
  const deleteNote = () => {
    if (!window.confirm('Удалить комментарий к этому дню?')) return
    update(d => { const notes = { ...d.notes }; delete notes[noteKey]; return { ...d, notes } }); notify('Запись удалена')
  }
  return <>
    <div className="topbar"><div><p className="eyebrow">PANK FAMILY FIT</p>{viewer.role === 'admin' ? <div className="profile-switch">{USERS.map(u => <button key={u.id} className={profile.id === u.id ? 'active' : ''} onClick={() => setProfile(u)}>{u.name}</button>)}</div> : <h1>Привет, {viewer.name}</h1>}</div><div className="avatar">{profile.name[0]}</div></div>
    <DayPicker date={date} setDate={setDate} /><MacroCard total={total} goal={goal} />
    {date !== todayISO() && dayIsEmpty && <div className="day-empty"><FileQuestion aria-hidden="true" /><div><strong>На {prettyDate(date)} нет истории</strong><span>Добавьте еду или комментарий, чтобы создать запись дня.</span></div></div>}
    <section className="meal-section"><div className="meal-tabs" role="tablist">{Object.entries(MEALS).map(([k, v]) => <button role="tab" aria-selected={meal === k} className={meal === k ? 'active' : ''} key={k} onClick={() => setMeal(k)}>{v}</button>)}</div>
      <div className="meal-list">{mealEntries.length === 0 ? <div className="empty"><div className="empty-icon"><CookingPot aria-hidden="true" /></div><strong>В {MEALS[meal].toLowerCase()} пока нет еды</strong><span>Добавьте первую запись.</span></div> : mealEntries.map(e => <article className="meal-row" key={e.id}><div><strong>{e.foodName}</strong><span>{e.amount} {UNIT_LABELS[e.unit] || e.unit} · Б {round(e.protein)} · Ж {round(e.fat)} · У {round(e.carbs)}</span></div><strong>{round(e.calories)} <small>ккал</small></strong><div className="row-actions"><button aria-label={`Изменить ${e.foodName}`} onClick={() => setModal({ entry: e })}><Pencil /></button><button aria-label={`Удалить ${e.foodName}`} onClick={() => remove(e.id)}><Trash2 /></button></div></article>)}</div>
      <div className="meal-total"><span>Итого за приём</span><strong>{round(mealTotal.calories)} ккал</strong></div><button className="primary wide" onClick={() => setModal({ meal, date })}><Plus aria-hidden="true" />Добавить еду</button>
    </section>
    <DayNote key={noteKey} value={note} onSave={saveNote} onDelete={deleteNote} />
    {modal && <AddFoodModal foods={data.foods} initial={modal.entry || null} initialMeal={modal.meal || meal} initialDate={modal.date || date} onClose={() => setModal(null)} onSave={saveEntry} onCreate={context => { setModal(null); setCreating(context) }} />}
    {creating && <ProductModal onClose={() => setCreating(null)} onSave={createFood} />}
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
      <div className="average-title"><span className="section-label">СРЕДНЕЕ ЗА ДЕНЬ</span><span>7 календарных дней</span></div>
      <div className="average-grid">{metricRows.map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{round(report.average[key])} <small>{unit}</small></strong></div>)}</div>
    </section>
    <section className="week-days" aria-labelledby="week-days-title">
      <div className="week-days-head"><div><span className="section-label">ПО ДНЯМ</span><h2 id="week-days-title">Дни недели</h2></div><span>Факт / цель</span></div>
      <div className="week-day-list">{report.days.map(day => {
        const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`)).replace('.', '')
        const dateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${day.date}T12:00:00`)).replace('.', '')
        return <button key={day.date} onClick={() => openDay(day.date)} aria-label={`${weekday}, ${dateLabel}: ${day.fact.calories} из ${day.plan.calories} килокалорий, ${day.status.label}`}>
          <span className="day-date"><strong>{weekday}</strong><small>{dateLabel}</small></span>
          <span className="day-calories"><strong>{round(day.fact.calories)} <small>/ {round(day.plan.calories)}</small></strong><small>{signed(day.difference.calories)} ккал</small></span>
          <span className={`day-status ${day.status.key}`}>{day.status.label}</span><ChevronRight aria-hidden="true" />
        </button>
      })}</div>
    </section>
  </>
}

function HistoryPage({ viewer, profile, setProfile, data, setDate, goToday }) {
  const [mode, setMode] = useState('week')
  const dates = [...new Set([...data.entries.filter(e => e.userId === profile.id).map(e => e.date), ...Object.keys(data.notes).filter(k => k.startsWith(profile.id + ':')).map(k => k.split(':')[1])])].sort().reverse()
  return <><PageHead eyebrow="ДНЕВНИК" title="История" subtitle={`Дневник и отчёты · ${profile.name}`} />
    {viewer.role === 'admin' && <div className="profile-switch compact history-profile" aria-label="Профиль отчёта">{USERS.map(user => <button key={user.id} className={profile.id === user.id ? 'active' : ''} onClick={() => setProfile(user)}>{user.name}</button>)}</div>}
    <div className="history-modes" role="tablist" aria-label="Режим истории"><button role="tab" aria-selected={mode === 'week'} className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}><CalendarRange aria-hidden="true" />Неделя</button><button role="tab" aria-selected={mode === 'days'} className={mode === 'days' ? 'active' : ''} onClick={() => setMode('days')}><CalendarDays aria-hidden="true" />Дни</button></div>
    {mode === 'week' ? <WeeklyReport profile={profile} data={data} openDay={setDate} /> : dates.length === 0 ? <div className="page-empty history-empty"><History aria-hidden="true" /><h2>История пока пуста</h2><p>Добавленные дни появятся здесь.</p><button className="primary" onClick={goToday}>Перейти к сегодня</button></div> : <div className="history-list">{dates.map(itemDate => {
    const totals = sum(data.entries.filter(e => e.userId === profile.id && e.date === itemDate)); const goal = getGoal(data.goals, profile.id, itemDate)
    return <button key={itemDate} onClick={() => setDate(itemDate)}><CalendarDays aria-hidden="true" /><span><strong>{prettyDate(itemDate)}</strong><small>{round(totals.calories)} из {goal.calories} ккал</small></span><div className="mini-progress"><i style={{ width: `${Math.min(100, goal.calories ? totals.calories / goal.calories * 100 : 0)}%` }} /></div><ChevronRight aria-hidden="true" /></button>
  })}</div>}
  </>
}

function ProductsPage({ data, update, notify }) {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('Все'); const [favorites, setFavorites] = useState(false); const [modal, setModal] = useState(null)
  const activeFoods = data.foods.filter(f => !f.archived)
  const foods = activeFoods.filter(f => f.name.toLowerCase().includes(query.trim().toLowerCase()) && (category === 'Все' || f.category === category) && (!favorites || f.favorite)).sort((a, b) => b.usageCount - a.usageCount)
  const filtersActive = Boolean(query.trim()) || category !== 'Все' || favorites
  const save = food => { update(d => ({ ...d, foods: [...d.foods, food] })); setModal(null); notify('Продукт сохранён') }
  const archive = food => {
    if (!window.confirm(`Архивировать «${food.name}»? Старые записи в дневнике сохранятся.`)) return
    update(d => ({ ...d, foods: d.foods.map(x => x.id === food.id ? { ...x, archived: true } : x) })); notify('Продукт архивирован')
  }
  return <><PageHead eyebrow="БАЗА" title="Продукты" subtitle={`${activeFoods.length} продуктов и блюд`} />
    <div className="search"><Search aria-hidden="true" /><input aria-label="Поиск по продуктам" value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по продуктам" /></div>
    <div className="filter-row"><select aria-label="Категория" value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><button className={favorites ? 'filter active' : 'filter'} aria-pressed={favorites} onClick={() => setFavorites(!favorites)}><Star aria-hidden="true" />Любимые</button></div>
    <div className="product-actions"><button className="primary" onClick={() => setModal('product')}><Plus aria-hidden="true" />Продукт</button><button className="secondary" onClick={() => setModal('dish')}><Plus aria-hidden="true" />Блюдо</button></div>
    {foods.length > 0 ? <div className="product-list">{foods.map(f => <article key={f.id}><button className="star-button" aria-label={f.favorite ? 'Убрать из любимых' : 'Добавить в любимые'} aria-pressed={f.favorite} onClick={() => update(d => ({ ...d, foods: d.foods.map(x => x.id === f.id ? { ...x, favorite: !x.favorite } : x) }))}><Star className={f.favorite ? 'filled' : ''} /></button><div><strong>{f.name}</strong><span>{f.category} · {f.type === 'dish' ? 'Блюдо' : 'Продукт'}</span><small>{f.calories} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs}</small></div><button className="archive-button" aria-label={`Архивировать ${f.name}`} onClick={() => archive(f)}><Archive /></button></article>)}</div> : <div className="page-empty products-empty"><PackageOpen aria-hidden="true" /><h2>{activeFoods.length === 0 ? 'База продуктов пуста' : 'Ничего не нашли'}</h2><p>{activeFoods.length === 0 ? 'Создайте первый продукт или блюдо.' : 'Измените запрос или сбросьте фильтры.'}</p>{filtersActive && <button className="secondary" onClick={() => { setQuery(''); setCategory('Все'); setFavorites(false) }}>Сбросить фильтры</button>}</div>}
    {modal && <ProductModal type={modal} onClose={() => setModal(null)} onSave={save} />}
  </>
}

function SettingsPage({ viewer, data, update, onLogout, notify }) {
  const [profileId, setProfileId] = useState('danya'); const latest = getGoal(data.goals, profileId, todayISO()); const [form, setForm] = useState({ ...latest, startDate: todayISO() })
  const select = id => { setProfileId(id); const goal = getGoal(data.goals, id, todayISO()); setForm({ ...goal, startDate: todayISO() }) }
  const save = e => {
    e.preventDefault(); update(d => ({ ...d, goals: [...d.goals, { ...form, id: crypto.randomUUID(), userId: profileId, calories: Number(form.calories), protein: Number(form.protein), fat: Number(form.fat), carbs: Number(form.carbs) }] })); notify('Цель КБЖУ сохранена')
  }
  return <><PageHead eyebrow="ПРОФИЛЬ" title="Настройки" subtitle={`Вы вошли как ${viewer.name}`} />{viewer.role === 'admin' && <section className="settings-card"><div className="card-title"><div><span className="section-label">ЦЕЛИ КБЖУ</span><h2>Новая цель</h2></div><SlidersHorizontal aria-hidden="true" /></div><div className="profile-switch compact">{USERS.map(u => <button key={u.id} className={profileId === u.id ? 'active' : ''} onClick={() => select(u.id)}>{u.name}</button>)}</div><form onSubmit={save}><label>Применить с даты<input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label><div className="nutrient-inputs">{[['calories', 'Ккал'], ['protein', 'Белки'], ['fat', 'Жиры'], ['carbs', 'Углеводы']].map(([k, l]) => <label key={k}>{l}<input type="number" min="0" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}</div><button className="primary wide">Сохранить новую цель</button></form><p className="form-hint">Старые дни сохранят прежние цели.</p></section>}
    <section className="settings-card"><div className="card-title"><div><span className="section-label">УСТРОЙСТВО</span><h2>Сеанс</h2></div><CircleUserRound aria-hidden="true" /></div><button className="danger wide" onClick={onLogout}><LogOut aria-hidden="true" />Выйти на этом устройстве</button></section>
  </>
}

function PageHead({ eyebrow, title, subtitle }) { return <header className="page-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header> }

function BottomNav({ viewer, page, setPage }) {
  const links = [['today', Clock3, 'Сегодня'], ['history', History, 'История'], ...(viewer.role === 'admin' ? [['products', Apple, 'Продукты']] : []), ['settings', Settings, 'Настройки']]
  return <nav className="bottom-nav" aria-label="Основная навигация">{links.map(([key, Icon, label]) => <button key={key} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined} onClick={() => setPage(key)}><Icon aria-hidden="true" /><span>{label}</span></button>)}</nav>
}

export default function App() {
  const [viewer, setViewer] = useState(() => USERS.find(u => u.id === localStorage.getItem('pff-session')) || null)
  const [profile, setProfile] = useState(viewer || USERS[0]); const [page, setPage] = useState('today'); const [date, setDate] = useState(todayISO())
  const [toast, setToast] = useState(''); const toastTimer = useRef(null); const { data, update } = useStore()
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  const notify = message => { clearTimeout(toastTimer.current); setToast(message); toastTimer.current = setTimeout(() => setToast(''), 2600) }
  if (!viewer) return <Login onLogin={user => { setViewer(user); setProfile(user) }} />
  const gotoDate = value => { setDate(value); setPage('today') }
  const logout = () => { localStorage.removeItem('pff-session'); setPage('today'); setDate(todayISO()); setViewer(null) }
  return <div className="desktop-bg"><main className="app-shell"><div className="scroll-area">
    {page === 'today' && <Today viewer={viewer} profile={profile} setProfile={setProfile} data={data} update={update} date={date} setDate={setDate} notify={notify} />}
    {page === 'history' && <HistoryPage viewer={viewer} profile={profile} setProfile={setProfile} data={data} setDate={gotoDate} goToday={() => gotoDate(todayISO())} />}
    {page === 'products' && viewer.role === 'admin' && <ProductsPage data={data} update={update} notify={notify} />}
    {page === 'settings' && <SettingsPage viewer={viewer} data={data} update={update} onLogout={logout} notify={notify} />}
  </div><BottomNav viewer={viewer} page={page} setPage={setPage} /><Toast message={toast} /></main></div>
}
