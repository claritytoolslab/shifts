import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event, Task, TaskInsert, Category, Team } from '../../lib/database.types'
import { Plus, Pencil, Trash2, ChevronRight, X, ArrowLeft } from 'lucide-react'
import AdminAIAssistant from '../../components/AdminAIAssistant'

type TaskForm = Omit<TaskInsert, 'id' | 'event_id' | 'created_at' | 'updated_at'>

export default function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TaskForm>()
  const watchedTeam = watch('team_name')

  // Ryhmittely: kategoriat + joukkueet
  const categoryGroups = useMemo(() => {
    const map: Record<string, Task[]> = {}
    // Ensin lisätään kaikki kategoriat (myös tyhjät)
    allCategories.forEach(cat => { map[cat.name] = [] })
    tasks.filter(t => t.is_open).forEach(task => {
      const key = task.category || ''
      if (key && map[key] !== undefined) {
        map[key].push(task)
      } else if (key) {
        map[key] = [task]
      } else {
        // Ei kategoriaa → lisätään "Muut yleiset"
        if (!map['Muut yleiset']) map['Muut yleiset'] = []
        map['Muut yleiset'].push(task)
      }
    })
    return map
  }, [tasks, allCategories])

  const teamGroups = useMemo(() => {
    const map: Record<string, Task[]> = {}
    // Ensin lisätään kaikki joukkueet (myös tyhjät)
    allTeams.forEach(team => { map[team.name] = [] })
    tasks.filter(t => !t.is_open).forEach(task => {
      const key = task.team_name || 'Muu tiimi'
      if (map[key] !== undefined) {
        map[key].push(task)
      } else {
        map[key] = [task]
      }
    })
    return map
  }, [tasks, allTeams])

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, tasksRes, catRes, teamRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase.from('tasks').select('*').eq('event_id', eventId!).order('created_at'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
    ])

    if (eventRes.data) setEvent(eventRes.data as Event)
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (catRes.data) setAllCategories(catRes.data as Category[])
    if (teamRes.data) setAllTeams(teamRes.data as Team[])
    setLoading(false)
  }

  function openCreateForm() {
    setEditingTask(null)
    reset({
      name: '',
      description: '',
      min_age: undefined,
      requires_drivers_license: false,
      requires_tieturva: false,
      requires_hygiene_passport: false,
      other_requirements: '',
      category: '',
      team_name: '',
      is_open: true,
    })
    setShowForm(true)
  }

  function openEditForm(task: Task) {
    setEditingTask(task)
    reset({
      name: task.name,
      description: task.description ?? '',
      min_age: task.min_age ?? undefined,
      requires_drivers_license: task.requires_drivers_license,
      requires_tieturva: task.requires_tieturva,
      requires_hygiene_passport: task.requires_hygiene_passport,
      other_requirements: task.other_requirements ?? '',
      category: task.category ?? '',
      team_name: task.team_name ?? '',
      is_open: task.is_open,
    })
    setShowForm(true)
  }

  async function onSubmit(data: TaskForm) {
    setSaving(true)
    setError('')

    if (!data.category && !data.team_name) {
      setError('Valitse tehtävälle kategoria tai tiimi.')
      setSaving(false)
      return
    }

    const payload = {
      ...data,
      min_age: data.min_age ? Number(data.min_age) : null,
      category: data.category || null,
      team_name: data.team_name || null,
      is_open: !data.team_name,
    }

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingTask.id)
      if (error) {
        setError('Tallennus epäonnistui: ' + error.message)
      } else {
        setShowForm(false)
        fetchData()
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert({ ...payload, event_id: eventId! })
      if (error) {
        setError('Luonti epäonnistui: ' + error.message)
      } else {
        setShowForm(false)
        fetchData()
      }
    }
    setSaving(false)
  }

  async function deleteTask(id: string) {
    if (!confirm('Haluatko varmasti poistaa tämän tehtävän? Kaikki vuorot poistetaan myös.')) return
    await supabase.from('tasks').delete().eq('id', id)
    fetchData()
  }

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
        <div className="flex items-center gap-2 mb-6">
          <Link to="/admin/events" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{event?.name}</h2>
            <p className="text-sm text-gray-500">Tehtävien hallinta</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Tehtävät ({tasks.length})</h3>
          <button onClick={openCreateForm} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Uusi tehtävä
          </button>
        </div>

        {/* Lomake */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">
                  {editingTask ? 'Muokkaa tehtävää' : 'Uusi tehtävä'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="label">Tehtävän nimi *</label>
                  <input
                    {...register('name', { required: 'Nimi on pakollinen' })}
                    className="input"
                    placeholder="esim. Opaste, Järjestysmies"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">Kuvaus</label>
                  <textarea
                    {...register('description')}
                    className="input"
                    rows={3}
                    placeholder="Tehtävän kuvaus vapaaehtoistoimijalle"
                  />
                </div>

                <div>
                  <label className="label">Minimi-ikä</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    {...register('min_age')}
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
                        {...register('requires_drivers_license')}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      B-ajokortti
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        {...register('requires_tieturva')}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      Tieturva 1/2
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        {...register('requires_hygiene_passport')}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      Hygieniapassi
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Muut vaatimukset</label>
                  <input
                    {...register('other_requirements')}
                    className="input"
                    placeholder="esim. EA1-kurssi"
                  />
                </div>

                <div>
                  <label className="label">Tehtäväkategoria <span className="text-red-500 text-xs font-normal">(pakollinen, jos ei tiimiä)</span></label>
                  <select {...register('category')} className="input">
                    <option value="">– ei kategoriaa –</option>
                    {allCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Käytetään suodattamiseen käyttäjänäkymässä</p>
                </div>

                <div className="border-t pt-4">
                  <label className="label mb-2">Saatavuus</label>
                  <div>
                    <label className="label">Joukkue (jos joukkueelle varattu)</label>
                    <select
                      {...register('team_name', {
                        onChange: e => setValue('is_open', !e.target.value),
                      })}
                      className="input"
                    >
                      <option value="">– ei joukkuetta (yleinen tehtävä) –</option>
                      {allTeams.map(team => (
                        <option key={team.id} value={team.name}>{team.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {watchedTeam
                        ? 'Joukkuekohtainen tehtävä – näkyy vain kyseisen joukkueen alla'
                        : 'Yleinen tehtävä – näkyy kaikille käyttäjille'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Tallennetaan...' : editingTask ? 'Tallenna muutokset' : 'Luo tehtävä'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Peruuta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {tasks.length === 0 && allCategories.length === 0 && allTeams.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Ei tehtäviä. Luo ensimmäinen tehtävä!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Yleiset tehtävät – kategorioittain */}
            {Object.keys(categoryGroups).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Yleiset tehtävät</h3>
                <div className="space-y-2">
                  {Object.entries(categoryGroups).map(([cat, catTasks]) => (
                    <div key={cat} className="card p-0 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div>
                          <span className="font-semibold text-gray-900">{cat}</span>
                          <span className="ml-2 text-xs text-gray-400">{catTasks.length} tehtävää</span>
                        </div>
                      </div>
                      {catTasks.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">Ei tehtäviä tässä kategoriassa</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {catTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{task.name}</p>
                                {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {task.min_age && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{task.min_age}v+</span>}
                                  {task.requires_drivers_license && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti</span>}
                                  {task.requires_tieturva && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Tieturva</span>}
                                  {task.requires_hygiene_passport && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hygieniapassi</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3 shrink-0">
                                <Link
                                  to={`/admin/tasks/${task.id}`}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                  Valitse
                                  <ChevronRight size={14} />
                                </Link>
                                <button onClick={() => openEditForm(task)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => deleteTask(task.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Joukkuekohtaiset tehtävät */}
            {Object.keys(teamGroups).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Joukkuekohtaiset tehtävät</h3>
                <div className="space-y-2">
                  {Object.entries(teamGroups).map(([team, teamTasks]) => (
                    <div key={team} className="card p-0 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div>
                          <span className="font-semibold text-gray-900">{team}</span>
                          <span className="ml-2 text-xs text-gray-400">{teamTasks.length} tehtävää</span>
                        </div>
                      </div>
                      {teamTasks.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">Ei tehtäviä tässä joukkueessa</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {teamTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{task.name}</p>
                                {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {task.min_age && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{task.min_age}v+</span>}
                                  {task.requires_drivers_license && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti</span>}
                                  {task.requires_tieturva && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Tieturva</span>}
                                  {task.requires_hygiene_passport && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hygieniapassi</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3 shrink-0">
                                <Link
                                  to={`/admin/tasks/${task.id}`}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                  Valitse
                                  <ChevronRight size={14} />
                                </Link>
                                <button onClick={() => openEditForm(task)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => deleteTask(task.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AdminAIAssistant
        context="tasks"
        eventId={eventId}
        onSaved={fetchData}
      />
    </AdminLayout>
  )
}
