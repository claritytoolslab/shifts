import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Category, Team, Task, Event } from '../../lib/database.types'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface TaskFormState {
  event_id: string
  name: string
  description: string
  category: string
  min_age: string
  requires_drivers_license: boolean
  requires_tieturva: boolean
  requires_hygiene_passport: boolean
  other_requirements: string
}

function ItemList<T extends { id: string; name: string }>({
  title,
  items,
  onAdd,
  onRename,
  onDelete,
}: {
  title: string
  items: T[]
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAdding(true)
    await onAdd(trimmed)
    setNewName('')
    setAdding(false)
  }

  async function handleRename(id: string) {
    const trimmed = editingName.trim()
    if (!trimmed) return
    await onRename(id, trimmed)
    setEditingId(null)
  }

  function startEdit(item: T) {
    setEditingId(item.id)
    setEditingName(item.name)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">Ei vielä kohteita.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2">
              {editingId === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(item.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="input flex-1 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleRename(item.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          className="input flex-1 text-sm"
          placeholder="Uuden nimi..."
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="btn-primary flex items-center gap-1 text-sm px-3"
        >
          <Plus size={15} />
          Lisää
        </button>
      </div>
    </div>
  )
}

export default function AdminCategoriesTeams() {
  const [categories, setCategories] = useState<Category[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskSaving, setTaskSaving] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [taskFormErrors, setTaskFormErrors] = useState<Record<string, string>>({})
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all')

  const emptyTaskForm = (): TaskFormState => ({
    event_id: '',
    name: '',
    description: '',
    category: '',
    min_age: '',
    requires_drivers_license: false,
    requires_tieturva: false,
    requires_hygiene_passport: false,
    other_requirements: '',
  })

  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm())

  function setTaskField<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
    setTaskForm(prev => ({ ...prev, [key]: value }))
    setTaskFormErrors(prev => ({ ...prev, [key]: '' }))
  }

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [catRes, teamRes, taskRes, eventRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('tasks').select('*').order('name'),
      supabase.from('events').select('id, name, start_date').order('start_date', { ascending: false }),
    ])
    if (catRes.data) setCategories(catRes.data as Category[])
    if (teamRes.data) setTeams(teamRes.data as Team[])
    if (taskRes.data) setTasks(taskRes.data as Task[])
    if (eventRes.data) setEvents(eventRes.data as Event[])
    setLoading(false)
  }

  // Kategoriat
  async function addCategory(name: string) {
    const { error } = await supabase.from('categories').insert({ name })
    if (error) setError(error.message)
    else fetchAll()
  }
  async function renameCategory(id: string, name: string) {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id)
    if (error) setError(error.message)
    else fetchAll()
  }
  async function deleteCategory(id: string) {
    if (!confirm('Poista kategoria?')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchAll()
  }

  // Tiimit
  async function addTeam(name: string) {
    const { error } = await supabase.from('teams').insert({ name })
    if (error) setError(error.message)
    else fetchAll()
  }
  async function renameTeam(id: string, name: string) {
    const { error } = await supabase.from('teams').update({ name }).eq('id', id)
    if (error) setError(error.message)
    else fetchAll()
  }
  async function deleteTeam(id: string) {
    if (!confirm('Poista tiimi?')) return
    await supabase.from('teams').delete().eq('id', id)
    fetchAll()
  }

  // Tehtävät
  function openCreateTaskForm() {
    setEditingTask(null)
    setTaskForm(emptyTaskForm())
    setTaskFormErrors({})
    setShowTaskForm(true)
    setTaskError('')
  }

  function openEditTaskForm(task: Task) {
    setEditingTask(task)
    setTaskForm({
      event_id: task.event_id,
      name: task.name,
      description: task.description ?? '',
      category: task.category ?? '',
      min_age: task.min_age != null ? String(task.min_age) : '',
      requires_drivers_license: task.requires_drivers_license,
      requires_tieturva: task.requires_tieturva,
      requires_hygiene_passport: task.requires_hygiene_passport,
      other_requirements: task.other_requirements ?? '',
    })
    setTaskFormErrors({})
    setShowTaskForm(true)
    setTaskError('')
  }

  async function onTaskSubmit() {
    const errs: Record<string, string> = {}
    if (!taskForm.event_id) errs.event_id = 'Valitse tapahtuma'
    if (!taskForm.name.trim()) errs.name = 'Nimi on pakollinen'
    if (Object.keys(errs).length > 0) {
      setTaskFormErrors(errs)
      return
    }

    setTaskSaving(true)
    setTaskError('')

    const payload = {
      name: taskForm.name.trim(),
      description: taskForm.description || null,
      category: taskForm.category || null,
      min_age: taskForm.min_age ? Number(taskForm.min_age) : null,
      requires_drivers_license: taskForm.requires_drivers_license,
      requires_tieturva: taskForm.requires_tieturva,
      requires_hygiene_passport: taskForm.requires_hygiene_passport,
      other_requirements: taskForm.other_requirements || null,
    }

    if (editingTask) {
      const { error } = await supabase.from('tasks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingTask.id)
      if (error) { setTaskError('Tallennus epäonnistui: ' + error.message); setTaskSaving(false); return }
    } else {
      const { error } = await supabase.from('tasks').insert({ ...payload, event_id: taskForm.event_id })
      if (error) { setTaskError('Luonti epäonnistui: ' + error.message); setTaskSaving(false); return }
    }

    setShowTaskForm(false)
    fetchAll()
    setTaskSaving(false)
  }

  async function deleteTask(id: string) {
    if (!confirm('Poista tehtävä? Kaikki siihen liittyvät vuorot poistetaan.')) return
    await supabase.from('tasks').delete().eq('id', id)
    fetchAll()
  }

  const filteredTasks = selectedEventFilter === 'all'
    ? tasks
    : tasks.filter(t => t.event_id === selectedEventFilter)

  const eventName = (id: string) => events.find(e => e.id === id)?.name ?? '–'

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Kategoriat, Tiimit & Tehtävät</h2>
          <p className="text-sm text-gray-500 mt-1">Globaalit listat – tehtävät ovat yhteisiä kaikille joukkueille</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <ItemList
            title="Kategoriat"
            items={categories}
            onAdd={addCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
          />
          <ItemList
            title="Tiimit / Joukkueet"
            items={teams}
            onAdd={addTeam}
            onRename={renameTeam}
            onDelete={deleteTeam}
          />
        </div>

        {/* Tehtävät */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Tehtävät</h3>
              <p className="text-xs text-gray-400 mt-0.5">Globaalit tehtävät – vuorot liitetään joukkueeseen erikseen</p>
            </div>
            <button onClick={openCreateTaskForm} className="btn-primary flex items-center gap-1 text-sm px-3">
              <Plus size={15} />
              Uusi tehtävä
            </button>
          </div>

          {/* Tapahtuma-suodatin */}
          <div className="mb-3">
            <select
              value={selectedEventFilter}
              onChange={e => setSelectedEventFilter(e.target.value)}
              className="input text-sm py-1.5"
            >
              <option value="all">Kaikki tapahtumat ({tasks.length} tehtävää)</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({tasks.filter(t => t.event_id === ev.id).length} tehtävää)
                </option>
              ))}
            </select>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Ei tehtäviä.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{task.name}</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-xs text-gray-400">{eventName(task.event_id)}</span>
                      {task.category && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{task.category}</span>
                      )}
                      {task.min_age && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{task.min_age}v+</span>}
                      {task.requires_drivers_license && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti</span>}
                      {task.requires_tieturva && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Tieturva</span>}
                      {task.requires_hygiene_passport && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hygieniapassi</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditTaskForm(task)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tehtävälomake */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">{editingTask ? 'Muokkaa tehtävää' : 'Uusi tehtävä'}</h3>
                <button onClick={() => setShowTaskForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Tapahtuma *</label>
                  <select
                    value={taskForm.event_id}
                    onChange={e => setTaskField('event_id', e.target.value)}
                    className="input"
                    disabled={!!editingTask}
                  >
                    <option value="">— Valitse tapahtuma —</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date})</option>
                    ))}
                  </select>
                  {taskFormErrors.event_id && <p className="text-red-500 text-xs mt-1">{taskFormErrors.event_id}</p>}
                </div>

                <div>
                  <label className="label">Tehtävän nimi *</label>
                  <input
                    value={taskForm.name}
                    onChange={e => setTaskField('name', e.target.value)}
                    className="input"
                    placeholder="esim. Järjestysmies, Buffa, Opas"
                  />
                  {taskFormErrors.name && <p className="text-red-500 text-xs mt-1">{taskFormErrors.name}</p>}
                </div>

                <div>
                  <label className="label">Kuvaus</label>
                  <textarea
                    value={taskForm.description}
                    onChange={e => setTaskField('description', e.target.value)}
                    className="input"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="label">Kategoria</label>
                  <select
                    value={taskForm.category}
                    onChange={e => setTaskField('category', e.target.value)}
                    className="input"
                  >
                    <option value="">— ei kategoriaa —</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Minimi-ikä</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taskForm.min_age}
                    onChange={e => setTaskField('min_age', e.target.value)}
                    className="input"
                    placeholder="esim. 18"
                  />
                </div>

                <div>
                  <label className="label">Erityisvaatimukset</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={taskForm.requires_drivers_license}
                        onChange={e => setTaskField('requires_drivers_license', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      B-ajokortti
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={taskForm.requires_tieturva}
                        onChange={e => setTaskField('requires_tieturva', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      Tieturva 1/2
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={taskForm.requires_hygiene_passport}
                        onChange={e => setTaskField('requires_hygiene_passport', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      Hygieniapassi
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Muut vaatimukset</label>
                  <input
                    value={taskForm.other_requirements}
                    onChange={e => setTaskField('other_requirements', e.target.value)}
                    className="input"
                    placeholder="esim. EA1-kurssi"
                  />
                </div>

                {taskError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{taskError}</div>}

                <div className="flex gap-3 pt-2">
                  <button onClick={onTaskSubmit} disabled={taskSaving} className="btn-primary flex-1">
                    {taskSaving ? 'Tallennetaan...' : editingTask ? 'Tallenna' : 'Luo tehtävä'}
                  </button>
                  <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">Peruuta</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
