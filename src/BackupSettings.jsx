import { useRef, useState } from 'react'
import { DatabaseBackup, Download, Upload } from 'lucide-react'

const DATA_KEYS = ['foods', 'goals', 'weightGoals', 'entries', 'notes', 'weightEntries', 'recipeIngredients', 'workoutSessions', 'exerciseLibrary', 'workoutExercises', 'workoutSets', 'messagePhrases', 'dailyPhraseShows', 'directMessages']
const REQUIRED_DATA_KEYS = DATA_KEYS.filter(key => key !== 'weightGoals')
const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const validBackup = backup => backup?.format === 'pank-family-fit-backup' && isPlainObject(backup.data) && REQUIRED_DATA_KEYS.every(key => key === 'notes' ? isPlainObject(backup.data.notes) : Array.isArray(backup.data[key])) && (backup.data.weightGoals === undefined || Array.isArray(backup.data.weightGoals))
const cleanedData = data => Object.fromEntries(DATA_KEYS.map(key => [key, key === 'notes' ? { ...(data.notes || {}) } : [...(data[key] || [])]]))

export default function BackupSettings({ data, update, notify, hasLocalMigration, migrateLocalData, dismissLocalMigration }) {
  const inputRef = useRef(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const download = () => {
    const backup = { format: 'pank-family-fit-backup', version: '0.14.0', exportedAt: new Date().toISOString(), data: cleanedData(data) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `pank-family-fit-backup-${backup.exportedAt.slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url)
    notify('Резервная копия скачана')
  }
  const importFile = event => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result))
        if (!validBackup(backup)) throw new Error('Файл не является резервной копией Pank Family Fit.')
        if (!window.confirm('Импорт заменит текущие данные на этом устройстве. Продолжить?')) return
        update(() => cleanedData(backup.data)); setError(''); notify('Резервная копия импортирована')
      } catch (reason) { setError(reason.message || 'Не удалось прочитать JSON-файл.') }
    }
    reader.onerror = () => setError('Не удалось прочитать файл.')
    reader.readAsText(file)
  }
  const migrate = async () => {
    if (!window.confirm('Данные будут добавлены в Supabase. Старые записи не удаляются автоматически. Продолжить?')) return
    setBusy(true); const done = await migrateLocalData(); setBusy(false)
    if (done) notify('Локальные данные перенесены в Supabase')
  }
  return <>
    <section className="settings-card backup-card" aria-labelledby="backup-title">
      <div className="card-title"><div><span className="section-label">ДАННЫЕ</span><h2 id="backup-title">Резервная копия</h2></div><DatabaseBackup aria-hidden="true" /></div>
      <p className="form-hint">JSON содержит дневник, продукты, рецепты, цели, вес, тренировки, послания и комментарии. PIN, токены и ключи не входят.</p>
      <div className="backup-actions"><button className="secondary" onClick={download}><Download aria-hidden="true" />Скачать JSON</button><button className="secondary" onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" />Импортировать JSON</button></div>
      <input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFile} />
      {error && <p className="backup-error" role="alert">{error}</p>}
    </section>
    {hasLocalMigration && <section className="settings-card migration-card" aria-labelledby="migration-title"><div><span className="section-label">SUPABASE</span><h2 id="migration-title">Перенести локальные данные</h2></div><p className="form-hint">Найдена локальная копия. Дубликаты по пользователю и дате, продуктам и посланиям не создаются.</p><div className="backup-actions"><button className="primary" disabled={busy} onClick={migrate}>{busy ? 'Переносим…' : 'Перенести в Supabase'}</button><button className="secondary" disabled={busy} onClick={dismissLocalMigration}>Не сейчас</button></div></section>}
  </>
}
