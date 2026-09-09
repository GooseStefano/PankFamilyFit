import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, Dumbbell,
  History, Pencil, Plus, Search, Trash2, X,
} from 'lucide-react'
import { prettyDate, shiftDate, todayISO } from './data'

const WEEK_TYPES = { A: 'Неделя А — сила', B: 'Неделя Б — объём' }
const MUSCLE_GROUPS = {
  chest_triceps: 'Грудь / трицепс',
  back_biceps: 'Спина / бицепс',
  legs_shoulders: 'Ноги / плечи',
}

const stamp = () => new Date().toISOString()
const numberOrNull = value => value === '' ? null : Number(value)
const displayValue = value => value === null || value === undefined || value === '' ? '—' : value
const russianDate = iso => new Intl.DateTimeFormat('ru-RU').format(new Date(`${iso}T12:00:00`))

function WorkoutDatePicker({ date, setDate }) {
  const inputRef = useRef(null)
  const today = todayISO()
  return <div className="date-row workout-date-row">
    <button className="icon-button" aria-label="Предыдущий день" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft /></button>
    <button className="date-title" onClick={() => inputRef.current?.showPicker?.()}>
      <strong>{date === today ? 'Сегодня' : prettyDate(date)}</strong><span>{russianDate(date)}</span>
      <input ref={inputRef} type="date" value={date} max={today} onChange={event => setDate(event.target.value)} tabIndex="-1" />
    </button>
    <button className="icon-button" aria-label="Следующий день" disabled={date === today} onClick={() => setDate(shiftDate(date, 1))}><ChevronRight /></button>
  </div>
}

function ExerciseModal({ initial, library, muscleGroup, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [libraryId, setLibraryId] = useState(initial?.exerciseLibraryId || null)
  const [plannedSets, setPlannedSets] = useState(initial?.plannedSets ?? 4)
  const [repMin, setRepMin] = useState(initial?.repMin ?? 8)
  const [repMax, setRepMax] = useState(initial?.repMax ?? 12)
  const [plannedWeight, setPlannedWeight] = useState(initial?.plannedWeight ?? '')
  const [planComment, setPlanComment] = useState(initial?.planComment || '')
  const [touched, setTouched] = useState(false)
  const visible = library.filter(item => !item.isArchived && item.name.toLowerCase().includes(name.trim().toLowerCase())).slice(0, 6)
  const setsValue = Number(plannedSets); const minValue = Number(repMin); const maxValue = Number(repMax)
  const invalid = !name.trim() || !Number.isInteger(setsValue) || setsValue < 1 || setsValue > 20 || !Number.isInteger(minValue) || minValue < 1 || !Number.isInteger(maxValue) || maxValue < minValue || (plannedWeight !== '' && Number(plannedWeight) < 0)
  const choose = item => { setName(item.name); setLibraryId(item.id) }
  const submit = event => {
    event.preventDefault(); setTouched(true)
    if (invalid) return
    onSave({
      ...initial, name: name.trim(), exerciseLibraryId: libraryId, defaultMuscleGroup: muscleGroup,
      plannedSets: setsValue, repMin: minValue, repMax: maxValue,
      plannedWeight: numberOrNull(plannedWeight), planComment: planComment.trim(),
    })
  }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="sheet workout-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title">
      <header><div><span className="section-label">ТРЕНИРОВКА</span><h2 id="exercise-modal-title">{initial ? 'Изменить упражнение' : 'Добавить упражнение'}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X /></button></header>
      <form onSubmit={submit}>
        <label htmlFor="exercise-name">Название упражнения
          <div className="search exercise-search"><Search aria-hidden="true" /><input id="exercise-name" autoFocus value={name} onChange={event => { setName(event.target.value); setLibraryId(null) }} placeholder="Например, жим лёжа" /></div>
        </label>
        {!initial && (library.length === 0 ? <div className="compact-empty exercise-library-empty"><Dumbbell aria-hidden="true" /><strong>База упражнений пуста</strong><span>Введите название — упражнение сохранится в базе.</span></div> : name.trim() && visible.length > 0 ? <div className="exercise-library-results" aria-label="Упражнения из базы">{visible.map(item => <button type="button" key={item.id} onClick={() => choose(item)}><Dumbbell aria-hidden="true" /><span><strong>{item.name}</strong><small>{MUSCLE_GROUPS[item.defaultMuscleGroup] || 'Без группы'}</small></span></button>)}</div> : null)}
        <div className="form-grid workout-plan-grid"><label>Подходы<input type="number" inputMode="numeric" min="1" max="20" value={plannedSets} onChange={event => setPlannedSets(event.target.value)} /></label><label>Плановый вес, кг<input type="number" inputMode="decimal" min="0" step="0.5" value={plannedWeight} onChange={event => setPlannedWeight(event.target.value)} placeholder="Не указан" /></label></div>
        <div className="form-grid"><label>Повторы от<input type="number" inputMode="numeric" min="1" value={repMin} onChange={event => setRepMin(event.target.value)} /></label><label>Повторы до<input type="number" inputMode="numeric" min="1" value={repMax} onChange={event => setRepMax(event.target.value)} /></label></div>
        <label>Комментарий к плану<textarea value={planComment} onChange={event => setPlanComment(event.target.value)} placeholder="Техника, темп или цель" /></label>
        <div className="field-error" role="alert">{touched && invalid ? 'Заполните название, 1–20 подходов и корректный диапазон повторений.' : ''}</div>
        <button className="primary wide" disabled={invalid}>{initial ? 'Сохранить изменения' : 'Добавить упражнение'}</button>
      </form>
    </section>
  </div>
}

function WorkoutExerciseCard({ exercise, sets, updateSet, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return <article className="workout-exercise-card">
    <div className="exercise-card-head"><div><h2>{exercise.name}</h2><p>Цель: {exercise.plannedSets} × {exercise.repMin}–{exercise.repMax} · {displayValue(exercise.plannedWeight)} кг</p>{exercise.planComment && <small>{exercise.planComment}</small>}</div><div className="exercise-card-actions"><button aria-label={`Изменить ${exercise.name}`} onClick={onEdit}><Pencil /></button><button aria-label={`Удалить ${exercise.name}`} onClick={onDelete}><Trash2 /></button></div></div>
    <button className="expand-sets" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />} {expanded ? 'Скрыть подходы' : 'Раскрыть подходы'}<span>{sets.filter(item => item.weight !== '' || item.reps !== '' || item.difficulty !== '' || item.comment).length}/{sets.length}</span></button>
    {expanded && <div className="workout-sets">
      {sets.map(set => <fieldset className="workout-set" key={set.id}><legend>Подход {set.setNumber}</legend>
        <div className="set-fields"><label>Вес, кг<input type="number" inputMode="decimal" min="0" step="0.5" value={set.weight} onChange={event => updateSet(set.id, 'weight', event.target.value)} /></label><label>Повторы<input type="number" inputMode="numeric" min="0" value={set.reps} onChange={event => updateSet(set.id, 'reps', event.target.value)} /></label><label>Тяжесть<input type="number" inputMode="numeric" min="1" max="10" value={set.difficulty} onChange={event => updateSet(set.id, 'difficulty', event.target.value)} placeholder="1–10" /></label></div>
        <div className="difficulty-quick" role="group" aria-label={`Быстрый выбор тяжести для подхода ${set.setNumber}`}>{[6, 7, 8, 9, 10].map(value => <button type="button" key={value} className={Number(set.difficulty) === value ? 'active' : ''} aria-pressed={Number(set.difficulty) === value} onClick={() => updateSet(set.id, 'difficulty', String(value))}>{value}</button>)}</div>
        <label>Комментарий<textarea value={set.comment} onChange={event => updateSet(set.id, 'comment', event.target.value)} placeholder="Опционально" /></label>
      </fieldset>)}
      <p className="sets-autosave" role="status">Изменения в подходах сохраняются автоматически.</p>
    </div>}
  </article>
}

function PastWorkout({ session, exercises, sets, canCopy, onCopy }) {
  return <section className="past-workout" aria-labelledby="past-workout-title">
    <div className="workout-section-head"><div><span className="section-label">ПОДСКАЗКА</span><h2 id="past-workout-title">Прошлый раз</h2></div><History aria-hidden="true" /></div>
    {!session ? <div className="past-empty"><strong>Прошлой тренировки нет</strong><span>Для выбранных недели и группы мышц пока нет сохранённой тренировки.</span></div> : <><p className="past-date"><span>Прошлая тренировка</span><strong>{russianDate(session.date)}</strong></p>{exercises.length ? <div className="past-exercises">{exercises.map(exercise => {
      const rows = sets.filter(item => item.workoutExerciseId === exercise.id).sort((a, b) => a.setNumber - b.setNumber)
      const fact = rows.map(item => item.weight === '' && item.reps === '' ? '—' : `${displayValue(item.weight)} кг × ${displayValue(item.reps)}`).join(' · ')
      return <div key={exercise.id}><strong>{exercise.name}</strong><span>План: {exercise.plannedSets} × {exercise.repMin}–{exercise.repMax} · {displayValue(exercise.plannedWeight)} кг</span><span className="past-fact">Факт: {fact}</span><span>Тяжесть: {rows.map(item => displayValue(item.difficulty)).join(' / ')}</span></div>
    })}</div> : <div className="past-empty"><strong>В прошлой тренировке нет упражнений</strong><span>Переносить пока нечего.</span></div>}{canCopy && <button className="secondary wide copy-previous" onClick={onCopy}><Copy aria-hidden="true" />Перенести прошлый план</button>}</>}
  </section>
}

function workoutReport(session, exercises, sets) {
  const lines = [
    'Тренировка: Даня', `Дата: ${russianDate(session.date)}`, `Тип: ${WEEK_TYPES[session.weekType]}`,
    `Группа: ${MUSCLE_GROUPS[session.muscleGroup]}`,
  ]
  if (session.wellbeingScore) lines.push(`Самочувствие: ${session.wellbeingScore}/10`)
  if (session.note) lines.push(`Комментарий: ${session.note}`)
  exercises.forEach(exercise => {
    lines.push('', exercise.name, `Цель: ${exercise.plannedSets} × ${exercise.repMin}–${exercise.repMax} · ${displayValue(exercise.plannedWeight)} кг`, 'Факт:', '')
    sets.filter(item => item.workoutExerciseId === exercise.id).sort((a, b) => a.setNumber - b.setNumber).forEach(item => {
      const empty = item.weight === '' && item.reps === '' && item.difficulty === '' && !item.comment
      lines.push(`${item.setNumber}. ${empty ? 'не выполнен' : `${displayValue(item.weight)} кг × ${displayValue(item.reps)}${item.difficulty === '' ? '' : ` · тяжесть ${item.difficulty}/10`}`}`)
    })
    if (exercise.planComment) lines.push('', `Комментарий: ${exercise.planComment}`)
    const setComments = sets.filter(item => item.workoutExerciseId === exercise.id && item.comment).map(item => `${item.setNumber}-й подход: ${item.comment}`)
    if (setComments.length) lines.push('', `Комментарии к подходам: ${setComments.join('; ')}`)
  })
  return lines.join('\n')
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return } catch { /* Use the legacy local fallback below. */ }
  }
  const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'
  document.body.appendChild(textarea); textarea.select(); const copied = document.execCommand('copy'); textarea.remove()
  if (!copied) throw new Error('Clipboard is unavailable')
}

export default function WorkoutPage({ viewer, data, update, notify }) {
  const [date, setDate] = useState(todayISO())
  const currentSession = data.workoutSessions.find(item => item.userId === viewer.id && item.date === date) || null
  const [weekType, setWeekType] = useState('A'); const [muscleGroup, setMuscleGroup] = useState('chest_triceps')
  const [wellbeingScore, setWellbeingScore] = useState(''); const [note, setNote] = useState(''); const [modal, setModal] = useState(null)
  useEffect(() => {
    setWeekType(currentSession?.weekType || 'A'); setMuscleGroup(currentSession?.muscleGroup || 'chest_triceps')
    setWellbeingScore(currentSession?.wellbeingScore ?? ''); setNote(currentSession?.note || '')
  }, [date, currentSession?.id])
  const exercises = currentSession ? data.workoutExercises.filter(item => item.sessionId === currentSession.id).sort((a, b) => a.orderIndex - b.orderIndex) : []
  const previousSession = data.workoutSessions.filter(item => item.userId === viewer.id && item.date < date && item.weekType === weekType && item.muscleGroup === muscleGroup).sort((a, b) => b.date.localeCompare(a.date))[0] || null
  const previousExercises = previousSession ? data.workoutExercises.filter(item => item.sessionId === previousSession.id).sort((a, b) => a.orderIndex - b.orderIndex) : []
  const wellbeingNumber = Number(wellbeingScore); const wellbeingInvalid = wellbeingScore !== '' && (wellbeingNumber < 1 || wellbeingNumber > 10)
  const sessionDetails = base => ({ ...base, weekType, muscleGroup, wellbeingScore: wellbeingInvalid ? null : numberOrNull(wellbeingScore), note: note.trim(), updatedAt: stamp() })
  const ensureSession = current => {
    const found = current.workoutSessions.find(item => item.userId === viewer.id && item.date === date)
    if (found) return { session: sessionDetails(found), created: false }
    const now = stamp(); return { session: sessionDetails({ id: crypto.randomUUID(), userId: viewer.id, date, createdAt: now }), created: true }
  }
  const saveDetails = () => {
    if (!currentSession) return
    update(current => ({ ...current, workoutSessions: current.workoutSessions.map(item => item.id === currentSession.id ? sessionDetails(item) : item) }))
    notify('Тренировка сохранена')
  }
  const saveExercise = values => {
    const editing = Boolean(values.id)
    update(current => {
      const { session, created } = ensureSession(current); const now = stamp()
      let libraryId = values.exerciseLibraryId
      let exerciseLibrary = current.exerciseLibrary
      if (!editing && !libraryId) {
        const existing = exerciseLibrary.find(item => !item.isArchived && item.name.toLowerCase() === values.name.toLowerCase())
        libraryId = existing?.id || crypto.randomUUID()
        if (!existing) exerciseLibrary = [...exerciseLibrary, { id: libraryId, name: values.name, defaultMuscleGroup: muscleGroup, createdAt: now, updatedAt: now, isArchived: false }]
      }
      const id = values.id || crypto.randomUUID()
      const exercise = { ...values, id, sessionId: session.id, exerciseLibraryId: libraryId, orderIndex: values.orderIndex ?? current.workoutExercises.filter(item => item.sessionId === session.id).length, createdAt: values.createdAt || now, updatedAt: now }
      const workoutExercises = editing ? current.workoutExercises.map(item => item.id === id ? exercise : item) : [...current.workoutExercises, exercise]
      const oldSets = current.workoutSets.filter(item => item.workoutExerciseId === id).sort((a, b) => a.setNumber - b.setNumber)
      const resizedSets = Array.from({ length: exercise.plannedSets }, (_, index) => oldSets[index] || { id: crypto.randomUUID(), workoutExerciseId: id, setNumber: index + 1, weight: '', reps: '', difficulty: '', comment: '', createdAt: now, updatedAt: now })
      return { ...current, exerciseLibrary, workoutSessions: created ? [...current.workoutSessions, session] : current.workoutSessions.map(item => item.id === session.id ? session : item), workoutExercises, workoutSets: [...current.workoutSets.filter(item => item.workoutExerciseId !== id), ...resizedSets] }
    })
    setModal(null); notify(editing ? 'Упражнение обновлено' : 'Упражнение добавлено')
  }
  const removeExercise = exercise => {
    if (!window.confirm(`Удалить «${exercise.name}» из тренировки?`)) return
    update(current => ({ ...current, workoutExercises: current.workoutExercises.filter(item => item.id !== exercise.id), workoutSets: current.workoutSets.filter(item => item.workoutExerciseId !== exercise.id) }))
    notify('Упражнение удалено')
  }
  const updateSet = (id, field, value) => {
    const numeric = Number(value)
    if (value !== '' && ((field === 'difficulty' && (numeric < 1 || numeric > 10)) || ((field === 'weight' || field === 'reps') && numeric < 0))) return
    update(current => ({ ...current, workoutSets: current.workoutSets.map(item => item.id === id ? { ...item, [field]: value, updatedAt: stamp() } : item) }))
  }
  const copyPrevious = () => {
    if (!previousSession || !previousExercises.length || exercises.length) return
    if (!window.confirm(`Перенести план тренировки за ${russianDate(previousSession.date)}? Прошлые результаты останутся только подсказкой.`)) return
    update(current => {
      const { session, created } = ensureSession(current); const now = stamp(); const copiedExercises = []; const copiedSets = []
      previousExercises.forEach((source, index) => {
        const id = crypto.randomUUID(); copiedExercises.push({ ...source, id, sessionId: session.id, orderIndex: index, createdAt: now, updatedAt: now })
        Array.from({ length: source.plannedSets }, (_, setIndex) => copiedSets.push({ id: crypto.randomUUID(), workoutExerciseId: id, setNumber: setIndex + 1, weight: '', reps: '', difficulty: '', comment: '', createdAt: now, updatedAt: now }))
      })
      return { ...current, workoutSessions: created ? [...current.workoutSessions, session] : current.workoutSessions.map(item => item.id === session.id ? session : item), workoutExercises: [...current.workoutExercises, ...copiedExercises], workoutSets: [...current.workoutSets, ...copiedSets] }
    })
    notify('Прошлый план перенесён')
  }
  const copyReport = async () => {
    if (!currentSession) return
    try { await copyText(workoutReport(currentSession, exercises, data.workoutSets)); notify('Отчёт скопирован') } catch { notify('Не удалось скопировать отчёт') }
  }
  const noWorkouts = !data.workoutSessions.some(item => item.userId === viewer.id)
  return <>
    <header className="page-head workout-page-head"><p className="eyebrow">ДНЕВНИК ДАНИ</p><h1>Тренировки</h1><p>План, подходы и прогресс без лишнего шума.</p></header>
    <WorkoutDatePicker date={date} setDate={setDate} />
    {noWorkouts && <div className="workouts-empty"><Dumbbell aria-hidden="true" /><div><strong>Тренировок пока нет</strong><span>Выберите план и добавьте первое упражнение.</span></div></div>}
    <section className="workout-details">
      <div className="form-grid"><label>Тип недели<select value={weekType} onChange={event => setWeekType(event.target.value)}>{Object.entries(WEEK_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Группа мышц<select value={muscleGroup} onChange={event => setMuscleGroup(event.target.value)}>{Object.entries(MUSCLE_GROUPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="form-grid workout-meta-grid"><label>Самочувствие, 1–10<input type="number" inputMode="numeric" min="1" max="10" value={wellbeingScore} onChange={event => setWellbeingScore(event.target.value)} placeholder="Опционально" /></label><label>Комментарий<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Как прошла тренировка" /></label></div>
      {wellbeingInvalid && <div className="field-error" role="alert">Самочувствие должно быть от 1 до 10.</div>}
      <button className="secondary wide save-workout" disabled={!currentSession || wellbeingInvalid} onClick={saveDetails}>Сохранить тренировку</button>
      {!currentSession && <p className="form-hint">Тренировка создастся после добавления первого упражнения.</p>}
    </section>
    <PastWorkout session={previousSession} exercises={previousExercises} sets={data.workoutSets} canCopy={!exercises.length && previousExercises.length > 0} onCopy={copyPrevious} />
    <div className="workout-list-head"><div><span className="section-label">ПЛАН И ФАКТ</span><h2>Упражнения</h2></div><span>{exercises.length}</span></div>
    {exercises.length ? <div className="workout-exercise-list">{exercises.map(exercise => <WorkoutExerciseCard key={exercise.id} exercise={exercise} sets={data.workoutSets.filter(item => item.workoutExerciseId === exercise.id).sort((a, b) => a.setNumber - b.setNumber)} updateSet={updateSet} onEdit={() => setModal({ exercise })} onDelete={() => removeExercise(exercise)} />)}</div> : <div className="workout-exercises-empty"><Dumbbell aria-hidden="true" /><strong>В тренировке нет упражнений</strong><span>Добавьте упражнение вручную или перенесите прошлый план.</span></div>}
    <div className="workout-primary-actions"><button className="primary" onClick={() => setModal({})}><Plus aria-hidden="true" />Упражнение</button><button className="secondary" disabled={!currentSession} onClick={copyReport}><Copy aria-hidden="true" />Скопировать отчёт</button></div>
    {modal && <ExerciseModal initial={modal.exercise || null} library={data.exerciseLibrary} muscleGroup={muscleGroup} onClose={() => setModal(null)} onSave={saveExercise} />}
  </>
}

export { MUSCLE_GROUPS, WEEK_TYPES, workoutReport }
