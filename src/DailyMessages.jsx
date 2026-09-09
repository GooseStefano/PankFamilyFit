import { useEffect, useState } from 'react'
import { Archive, Heart, MessageSquareText, Pencil, Plus, RotateCcw, Send, X } from 'lucide-react'
import { shiftDate, todayISO } from './data'

const DANYA_ID = 'danya'
const VIKA_ID = 'vika'
const MAX_MESSAGE_LENGTH = 300
const now = () => new Date().toISOString()
const formatShortDate = date => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))

function pickNextPhrase(phrases) {
  return [...phrases]
    .filter(phrase => phrase.isActive)
    .sort((a, b) => (Number(a.shownCount) || 0) - (Number(b.shownCount) || 0) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0] || null
}

function MessageCard({ title, text, emptyText, eyebrow }) {
  return <section className={`daily-message-card ${text ? 'has-message' : ''}`} aria-label={title}>
    <div className="daily-message-heading"><div><span className="section-label">{eyebrow}</span><h2>{title}</h2></div><Heart aria-hidden="true" /></div>
    {text ? <blockquote>{text}</blockquote> : <div className="daily-message-empty"><MessageSquareText aria-hidden="true" /><span>{emptyText}</span></div>}
  </section>
}

function TomorrowMessageForm({ data, update, notify, inSettings = false }) {
  const tomorrow = shiftDate(todayISO(), 1)
  const existing = data.directMessages.find(message => message.fromUserId === VIKA_ID && message.toUserId === DANYA_ID && message.showDate === tomorrow) || null
  const [draft, setDraft] = useState(existing?.text || '')
  useEffect(() => setDraft(existing?.text || ''), [existing?.id, existing?.text])
  const clean = draft.trim(); const unchanged = clean === (existing?.text || '')
  const submit = event => {
    event.preventDefault()
    if (!clean || unchanged) return
    const timestamp = now()
    const message = { id: existing?.id || crypto.randomUUID(), fromUserId: VIKA_ID, toUserId: DANYA_ID, showDate: tomorrow, text: clean, createdAt: existing?.createdAt || timestamp, updatedAt: timestamp }
    update(current => ({ ...current, directMessages: existing ? current.directMessages.map(item => item.id === existing.id ? message : item) : [...current.directMessages, message] }))
    notify(existing ? 'Послание обновлено' : 'Послание на завтра сохранено')
  }
  return <section className={inSettings ? 'settings-card tomorrow-message-card tomorrow-message-settings' : 'tomorrow-message-card'} aria-labelledby="tomorrow-message-title">
    <div className="daily-message-heading"><div><span className="section-label">{inSettings ? 'ПОСЛАНИЕ' : `НА ${formatShortDate(tomorrow).toUpperCase()}`}</span><h2 id="tomorrow-message-title">{inSettings ? 'Послание Дане' : 'Написать Дане на завтра'}</h2></div><Send aria-hidden="true" /></div>
    {!existing && !draft ? <p className="tomorrow-empty">Вы ещё не написали послание на завтра.</p> : existing && inSettings ? <p className="tomorrow-empty">На {formatShortDate(tomorrow)} послание сохранено. Его можно изменить.</p> : null}
    <form onSubmit={submit}><label htmlFor="tomorrow-message">Короткое послание<textarea id="tomorrow-message" maxLength={MAX_MESSAGE_LENGTH} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Что Даня прочитает завтра?" /></label>
      <div className="message-form-footer"><span>{draft.length}/{MAX_MESSAGE_LENGTH}</span><button className="secondary" disabled={!clean || unchanged}>Сохранить</button></div></form>
  </section>
}

export function TomorrowMessageSettings({ data, update, notify }) { return <TomorrowMessageForm data={data} update={update} notify={notify} inSettings /> }

export function DailyMessages({ viewer, date, data, update, notify }) {
  const show = data.dailyPhraseShows.find(item => item.targetUserId === VIKA_ID && item.date === date) || null
  const shownPhrase = show ? data.messagePhrases.find(phrase => phrase.id === show.phraseId && phrase.isActive) : null
  const activePhrases = data.messagePhrases.filter(phrase => phrase.createdBy === DANYA_ID && phrase.targetUserId === VIKA_ID && phrase.isActive)
  useEffect(() => {
    if (viewer.id !== VIKA_ID || show || activePhrases.length === 0) return
    update(current => {
      if (current.dailyPhraseShows.some(item => item.targetUserId === VIKA_ID && item.date === date)) return current
      const phrase = pickNextPhrase(current.messagePhrases.filter(item => item.createdBy === DANYA_ID && item.targetUserId === VIKA_ID))
      if (!phrase) return current
      const timestamp = now()
      return {
        ...current,
        messagePhrases: current.messagePhrases.map(item => item.id === phrase.id ? { ...item, shownCount: (Number(item.shownCount) || 0) + 1, lastShownDate: date, updatedAt: timestamp } : item),
        dailyPhraseShows: [...current.dailyPhraseShows, { id: crypto.randomUUID(), phraseId: phrase.id, targetUserId: VIKA_ID, date, createdAt: timestamp }],
      }
    })
  }, [viewer.id, date, show?.id, activePhrases.length, update])

  if (viewer.id === DANYA_ID) {
    const message = data.directMessages.find(item => item.fromUserId === VIKA_ID && item.toUserId === DANYA_ID && item.showDate === date)
    return <MessageCard eyebrow="ДЛЯ ТЕБЯ" title="Послание от Вики" text={message?.text} emptyText="Сегодня послания нет" />
  }
  return <MessageCard eyebrow="ОТ ДАНИ" title="Послание дня от Дани" text={shownPhrase?.text} emptyText="Пока нет посланий" />
}

function PhraseModal({ initial, onClose, onSave }) {
  const [text, setText] = useState(initial?.text || '')
  const clean = text.trim()
  const submit = event => { event.preventDefault(); if (clean) onSave(clean) }
  return <div className="scrim" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="sheet phrase-sheet" role="dialog" aria-modal="true" aria-labelledby="phrase-modal-title">
    <header><div><span className="section-label">ДЛЯ ВИКИ</span><h2 id="phrase-modal-title">{initial ? 'Изменить фразу' : 'Новая фраза'}</h2></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X /></button></header>
    <form onSubmit={submit}><label htmlFor="phrase-text">Текст фразы<textarea id="phrase-text" autoFocus maxLength={MAX_MESSAGE_LENGTH} value={text} onChange={event => setText(event.target.value)} placeholder="Напиши что-нибудь тёплое" /></label><div className="message-form-footer"><span>{text.length}/{MAX_MESSAGE_LENGTH}</span><button className="primary" disabled={!clean}>{initial ? 'Сохранить' : 'Добавить'}</button></div></form>
  </section></div>
}

function PhraseRow({ phrase, onEdit, onToggle }) {
  return <article className="phrase-row"><p>{phrase.text}</p><div className="phrase-meta"><span>Показано: {phrase.shownCount || 0}{phrase.lastShownDate ? ` · последний раз ${formatShortDate(phrase.lastShownDate)}` : ''}</span><div><button aria-label={`Изменить фразу: ${phrase.text}`} onClick={onEdit}><Pencil /></button><button aria-label={`${phrase.isActive ? 'Отключить' : 'Восстановить'} фразу: ${phrase.text}`} onClick={onToggle}>{phrase.isActive ? <Archive /> : <RotateCcw />}</button></div></div></article>
}

export function PhraseSettings({ viewer, data, update, notify }) {
  const [modal, setModal] = useState(null)
  if (viewer.id !== DANYA_ID) return null
  const phrases = data.messagePhrases.filter(item => item.createdBy === DANYA_ID && item.targetUserId === VIKA_ID)
  const active = phrases.filter(item => item.isActive); const archived = phrases.filter(item => !item.isActive)
  const save = text => {
    const editing = modal?.phrase
    const timestamp = now()
    update(current => ({ ...current, messagePhrases: editing ? current.messagePhrases.map(item => item.id === editing.id ? { ...item, text, updatedAt: timestamp } : item) : [...current.messagePhrases, { id: crypto.randomUUID(), text, createdBy: DANYA_ID, targetUserId: VIKA_ID, isActive: true, shownCount: 0, lastShownDate: null, createdAt: timestamp, updatedAt: timestamp }] }))
    setModal(null); notify(editing ? 'Фраза обновлена' : 'Фраза добавлена')
  }
  const toggle = phrase => {
    update(current => ({ ...current, messagePhrases: current.messagePhrases.map(item => item.id === phrase.id ? { ...item, isActive: !item.isActive, updatedAt: now() } : item) }))
    notify(phrase.isActive ? 'Фраза отключена' : 'Фраза восстановлена')
  }
  return <section className="settings-card phrase-settings" aria-labelledby="phrase-settings-title">
    <div className="card-title"><div><span className="section-label">ПОСЛАНИЯ ДНЯ</span><h2 id="phrase-settings-title">Фразы для Вики</h2></div><Heart aria-hidden="true" /></div>
    <p className="phrase-settings-intro">Активные фразы показываются по кругу без повторов.</p>
    <button className="primary wide" onClick={() => setModal({})}><Plus aria-hidden="true" />Добавить фразу</button>
    {phrases.length === 0 ? <div className="phrase-list-empty"><MessageSquareText aria-hidden="true" /><strong>Список фраз пуст</strong><span>Добавьте первую фразу для Вики.</span></div> : <div className="phrase-groups">
      <section><div className="phrase-group-title"><strong>Активные</strong><span>{active.length}</span></div>{active.length ? <div className="phrase-list">{active.map(phrase => <PhraseRow key={phrase.id} phrase={phrase} onEdit={() => setModal({ phrase })} onToggle={() => toggle(phrase)} />)}</div> : <p className="phrase-group-empty">Нет активных фраз.</p>}</section>
      <section><div className="phrase-group-title"><strong>Архив</strong><span>{archived.length}</span></div>{archived.length ? <div className="phrase-list archived">{archived.map(phrase => <PhraseRow key={phrase.id} phrase={phrase} onEdit={() => setModal({ phrase })} onToggle={() => toggle(phrase)} />)}</div> : <p className="phrase-group-empty">Архив пуст.</p>}</section>
    </div>}
    {modal && <PhraseModal initial={modal.phrase || null} onClose={() => setModal(null)} onSave={save} />}
  </section>
}
