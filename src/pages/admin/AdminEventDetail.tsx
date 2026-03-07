import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event, Task, TaskInsert } from '../../lib/database.types'
import { Plus, Pencil, Trash2, ChevronRight, X, ArrowLeft } from 'lucide-react'

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>()

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, tasksRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase.from('tasks').select('*').eq('event_id', eventId!).order('created_at'),
    ])

    if (eventRes.data) setEvent(eventRes.data as Event)
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
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
    })
    setShowForm(true)
  }

  async function onSubmit(data: TaskForm) {
    setSaving(true)
    setError('')

    const payload = {
      ...data,
      min_age: data.min_age ? Number(data.min_age) : null,
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

        {tasks.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Ei tehtäviä. Luo ensimmäinen tehtävä!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{task.name}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.min_age && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Ikäraja: {task.min_age}v
                        </span>
                      )}
                      {task.requires_drivers_license && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">B-kortti</span>
                      )}
                      {task.requires_tieturva && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Tieturva</span>
                      )}
                      {task.requires_hygiene_passport && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Hygieniapassi</span>
                      )}
                      {task.other_requirements && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {task.other_requirements}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/admin/tasks/${task.id}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Vuorot
                      <ChevronRight size={14} />
                    </Link>
                    <button
                      onClick={() => openEditForm(task)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
