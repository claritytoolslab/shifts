import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Task, ShiftAvailability, Registration, ShiftInsert } from '../../lib/database.types'
import { Plus, Trash2, X, ArrowLeft, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

type ShiftFormData = Omit<ShiftInsert, 'id' | 'task_id' | 'created_at' | 'updated_at'>

interface ShiftWithRegistrations extends ShiftAvailability {
  registrations?: Registration[]
}

export default function AdminTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const [task, setTask] = useState<Task | null>(null)
  const [shifts, setShifts] = useState<ShiftWithRegistrations[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedShift, setExpandedShift] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShiftFormData>()

  useEffect(() => {
    if (taskId) fetchData()
  }, [taskId])

  async function fetchData() {
    const [taskRes, shiftsRes] = await Promise.all([
      supabase.from('tasks').select('*, events(name, id)').eq('id', taskId!).single(),
      supabase.from('shift_availability').select('*').eq('task_id', taskId!).order('start_time'),
    ])

    if (taskRes.data) setTask(taskRes.data as unknown as Task)
    if (shiftsRes.data) setShifts(shiftsRes.data as ShiftWithRegistrations[])
    setLoading(false)
  }

  async function loadRegistrations(shiftId: string) {
    if (expandedShift === shiftId) {
      setExpandedShift(null)
      return
    }

    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('shift_id', shiftId)
      .order('created_at')

    setShifts(prev => prev.map(s =>
      s.shift_id === shiftId ? { ...s, registrations: (data as Registration[]) ?? [] } : s
    ))
    setExpandedShift(shiftId)
  }

  async function onSubmit(data: ShiftFormData) {
    setSaving(true)
    setError('')

    const { error } = await supabase.from('shifts').insert({
      ...data,
      task_id: taskId!,
      max_participants: Number(data.max_participants),
    })

    if (error) {
      setError('Luonti epäonnistui: ' + error.message)
    } else {
      setShowForm(false)
      reset()
      fetchData()
    }
    setSaving(false)
  }

  async function deleteShift(shiftId: string) {
    if (!confirm('Haluatko varmasti poistaa tämän vuoron? Kaikki ilmoittautumiset poistetaan myös.')) return
    await supabase.from('shifts').delete().eq('id', shiftId)
    fetchData()
  }

  async function updateRegistrationStatus(regId: string, status: 'confirmed' | 'cancelled') {
    await supabase.from('registrations').update({ status }).eq('id', regId)
    if (expandedShift) {
      const { data } = await supabase
        .from('registrations')
        .select('*')
        .eq('shift_id', expandedShift)
        .order('created_at')
      setShifts(prev => prev.map(s =>
        s.shift_id === expandedShift ? { ...s, registrations: (data as Registration[]) ?? [] } : s
      ))
    }
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

  const taskWithEvent = task as Task & { events?: { name: string; id: string } }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Link
            to={`/admin/events/${taskWithEvent?.events?.id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="text-sm text-gray-500">{taskWithEvent?.events?.name}</div>
            <h2 className="text-2xl font-bold text-gray-900">{task?.name}</h2>
            <p className="text-sm text-gray-500">Vuorojen hallinta</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Vuorot ({shifts.length})</h3>
          <button
            onClick={() => { setShowForm(true); reset() }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Uusi vuoro
          </button>
        </div>

        {/* Lomake */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">Uusi vuoro</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Alkuaika *</label>
                    <input
                      type="datetime-local"
                      {...register('start_time', { required: 'Alkuaika on pakollinen' })}
                      className="input"
                    />
                    {errors.start_time && <p className="text-red-500 text-sm mt-1">{errors.start_time.message}</p>}
                  </div>
                  <div>
                    <label className="label">Loppuaika *</label>
                    <input
                      type="datetime-local"
                      {...register('end_time', { required: 'Loppuaika on pakollinen' })}
                      className="input"
                    />
                    {errors.end_time && <p className="text-red-500 text-sm mt-1">{errors.end_time.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Paikkojen määrä *</label>
                  <input
                    type="number"
                    min={1}
                    {...register('max_participants', { required: 'Paikkojen määrä on pakollinen', min: 1 })}
                    className="input"
                    placeholder="esim. 5"
                  />
                  {errors.max_participants && <p className="text-red-500 text-sm mt-1">{errors.max_participants.message}</p>}
                </div>

                <div>
                  <label className="label">Sijainti</label>
                  <input
                    {...register('location')}
                    className="input"
                    placeholder="Tarkka sijainti vuorolle"
                  />
                </div>

                <div>
                  <label className="label">Lisätietoja</label>
                  <textarea
                    {...register('notes')}
                    className="input"
                    rows={2}
                    placeholder="Ohjeet, varusteet jne."
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Luodaan...' : 'Luo vuoro'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Peruuta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {shifts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Ei vuoroja. Luo ensimmäinen vuoro!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift.shift_id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Clock size={15} />
                        <span className="font-medium">
                          {format(new Date(shift.start_time), 'dd.MM.yyyy HH:mm', { locale: fi })}
                          {' – '}
                          {format(new Date(shift.end_time), 'HH:mm', { locale: fi })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={15} />
                        <span className={`text-sm font-medium ${
                          shift.available_spots === 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {shift.confirmed_count}/{shift.max_participants} ilmoittautunut
                        </span>
                      </div>
                      {shift.available_spots === 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Täynnä</span>
                      )}
                    </div>
                    {shift.location && (
                      <p className="text-sm text-gray-500 mt-1">{shift.location}</p>
                    )}
                    {shift.notes && (
                      <p className="text-sm text-gray-400 mt-0.5">{shift.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => loadRegistrations(shift.shift_id)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Users size={14} />
                      Ilmoittautuneet
                    </button>
                    <button
                      onClick={() => deleteShift(shift.shift_id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Ilmoittautuneet lista */}
                {expandedShift === shift.shift_id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Ilmoittautuneet ({shift.registrations?.length ?? 0})
                    </h4>
                    {!shift.registrations || shift.registrations.length === 0 ? (
                      <p className="text-sm text-gray-400">Ei ilmoittautumisia</p>
                    ) : (
                      <div className="space-y-2">
                        {shift.registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                          >
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {reg.first_name} {reg.last_name}
                              </div>
                              <div className="text-xs text-gray-500">{reg.email} · {reg.phone}</div>
                              <div className="flex gap-2 mt-1">
                                {reg.has_drivers_license && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti</span>
                                )}
                                {reg.has_tieturva && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Tieturva</span>
                                )}
                                {reg.has_hygiene_passport && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hygieniapassi</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                reg.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : reg.status === 'waitlisted'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {reg.status === 'confirmed' ? 'Vahvistettu'
                                  : reg.status === 'waitlisted' ? 'Jonossa'
                                  : 'Peruutettu'}
                              </span>
                              {reg.status === 'confirmed' && (
                                <button
                                  onClick={() => updateRegistrationStatus(reg.id, 'cancelled')}
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Peruuta
                                </button>
                              )}
                              {reg.status === 'cancelled' && (
                                <button
                                  onClick={() => updateRegistrationStatus(reg.id, 'confirmed')}
                                  className="text-xs text-green-600 hover:underline"
                                >
                                  Aktivoi
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
