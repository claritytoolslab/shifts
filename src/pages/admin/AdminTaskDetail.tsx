import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Task, ShiftAvailability, Registration, Team } from '../../lib/database.types'
import { Plus, Trash2, X, ArrowLeft, Users, Clock } from 'lucide-react'
import AdminAIAssistant from '../../components/AdminAIAssistant'
import { format, addDays, parseISO } from 'date-fns'
import { fi } from 'date-fns/locale'

interface ShiftWithRegistrations extends ShiftAvailability {
  registrations?: Registration[]
}

// Generoi lista päivistä start–end välille
function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  let current = parseISO(start)
  const last = parseISO(end)
  while (current <= last) {
    days.push(format(current, 'yyyy-MM-dd'))
    current = addDays(current, 1)
  }
  return days
}

// Tunnit ja minuutit valintaan
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

interface ShiftFormState {
  teamName: string
  startDay: string
  startHour: string
  startMinute: string
  endDay: string
  endHour: string
  endMinute: string
  maxParticipants: string
  location: string
  notes: string
}

export default function AdminTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const [task, setTask] = useState<Task | null>(null)
  const [shifts, setShifts] = useState<ShiftWithRegistrations[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [expandedShift, setExpandedShift] = useState<string | null>(null)

  const taskWithEvent = task as Task & { events?: { name: string; id: string; start_date?: string; end_date?: string } }

  const eventDays = useMemo(() => {
    if (taskWithEvent?.events?.start_date && taskWithEvent?.events?.end_date) {
      return getDaysBetween(taskWithEvent.events.start_date, taskWithEvent.events.end_date)
    }
    return []
  }, [taskWithEvent])

  const defaultForm = (): ShiftFormState => ({
    teamName: '',
    startDay: eventDays[0] ?? '',
    startHour: '09',
    startMinute: '00',
    endDay: eventDays[0] ?? '',
    endHour: '17',
    endMinute: '00',
    maxParticipants: '5',
    location: '',
    notes: '',
  })

  const [form, setForm] = useState<ShiftFormState>(defaultForm())

  function setField(key: keyof ShiftFormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFormErrors(prev => ({ ...prev, [key]: '' }))
  }

  useEffect(() => {
    if (taskId) fetchData()
  }, [taskId])

  // Päivitä oletuspäivät kun tapahtumadata latautuu
  useEffect(() => {
    if (eventDays.length > 0) {
      setForm(prev => ({
        ...prev,
        startDay: prev.startDay || eventDays[0],
        endDay: prev.endDay || eventDays[0],
      }))
    }
  }, [eventDays])

  async function fetchData() {
    const [taskRes, shiftsRes, teamsRes] = await Promise.all([
      supabase.from('tasks').select('*, events(name, id, start_date, end_date)').eq('id', taskId!).single(),
      supabase.from('shift_availability').select('*').eq('task_id', taskId!).order('start_time'),
      supabase.from('teams').select('*').order('name'),
    ])

    if (taskRes.data) setTask(taskRes.data as unknown as Task)
    if (shiftsRes.data) setShifts(shiftsRes.data as ShiftWithRegistrations[])
    if (teamsRes.data) setTeams(teamsRes.data as Team[])
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

  async function handleSave() {
    const errs: Record<string, string> = {}
    if (!form.startDay) errs.startDay = 'Valitse päivä'
    if (!form.endDay) errs.endDay = 'Valitse päivä'
    if (!form.maxParticipants || Number(form.maxParticipants) < 1) errs.maxParticipants = 'Vähintään 1'

    const startTime = `${form.startDay}T${form.startHour}:${form.startMinute}:00`
    const endTime = `${form.endDay}T${form.endHour}:${form.endMinute}:00`
    if (startTime >= endTime) errs.endHour = 'Loppuajan pitää olla alkuajan jälkeen'

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setSaving(true)
    setError('')

    const { error } = await supabase.from('shifts').insert({
      task_id: taskId!,
      start_time: startTime,
      end_time: endTime,
      max_participants: Number(form.maxParticipants),
      team_name: form.teamName || null,
      location: form.location || null,
      notes: form.notes || null,
    })

    if (error) {
      setError('Luonti epäonnistui: ' + error.message)
    } else {
      setShowForm(false)
      fetchData()
    }
    setSaving(false)
  }

  function openForm() {
    setForm(defaultForm())
    setFormErrors({})
    setError('')
    setShowForm(true)
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
            onClick={openForm}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Uusi vuoro
          </button>
        </div>

        {/* Lomake */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">Uusi vuoro</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Joukkue */}
                <div>
                  <label className="label">Joukkue</label>
                  <select
                    value={form.teamName}
                    onChange={e => setField('teamName', e.target.value)}
                    className="input"
                  >
                    <option value="">— Yleinen (kaikille) —</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Jos joukkue valittu, vuoro näkyy vain kyseisen joukkueen kohdalla</p>
                </div>

                {/* Alkuaika */}
                <div>
                  <label className="label">Alkuaika *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={form.startDay}
                      onChange={e => setField('startDay', e.target.value)}
                      className="input col-span-1"
                    >
                      {eventDays.length > 0
                        ? eventDays.map(d => (
                            <option key={d} value={d}>
                              {format(parseISO(d), 'EEE d.M.', { locale: fi })}
                            </option>
                          ))
                        : <option value="">Valitse päivä</option>
                      }
                    </select>
                    <select
                      value={form.startHour}
                      onChange={e => setField('startHour', e.target.value)}
                      className="input"
                    >
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={form.startMinute}
                      onChange={e => setField('startMinute', e.target.value)}
                      className="input"
                    >
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {formErrors.startDay && <p className="text-red-500 text-xs mt-1">{formErrors.startDay}</p>}
                </div>

                {/* Loppuaika */}
                <div>
                  <label className="label">Loppuaika *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={form.endDay}
                      onChange={e => setField('endDay', e.target.value)}
                      className="input col-span-1"
                    >
                      {eventDays.length > 0
                        ? eventDays.map(d => (
                            <option key={d} value={d}>
                              {format(parseISO(d), 'EEE d.M.', { locale: fi })}
                            </option>
                          ))
                        : <option value="">Valitse päivä</option>
                      }
                    </select>
                    <select
                      value={form.endHour}
                      onChange={e => setField('endHour', e.target.value)}
                      className="input"
                    >
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select
                      value={form.endMinute}
                      onChange={e => setField('endMinute', e.target.value)}
                      className="input"
                    >
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {formErrors.endHour && <p className="text-red-500 text-xs mt-1">{formErrors.endHour}</p>}
                  {formErrors.endDay && <p className="text-red-500 text-xs mt-1">{formErrors.endDay}</p>}
                </div>

                {/* Paikkojen määrä */}
                <div>
                  <label className="label">Paikkojen määrä *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxParticipants}
                    onChange={e => setField('maxParticipants', e.target.value)}
                    className="input"
                    placeholder="esim. 5"
                  />
                  {formErrors.maxParticipants && <p className="text-red-500 text-xs mt-1">{formErrors.maxParticipants}</p>}
                </div>

                {/* Sijainti */}
                <div>
                  <label className="label">Sijainti</label>
                  <input
                    value={form.location}
                    onChange={e => setField('location', e.target.value)}
                    className="input"
                    placeholder="Tarkka sijainti vuorolle"
                  />
                </div>

                {/* Lisätietoja */}
                <div>
                  <label className="label">Lisätietoja</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setField('notes', e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="Ohjeet, varusteet jne."
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Luodaan...' : 'Luo vuoro'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Peruuta
                  </button>
                </div>
              </div>
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
                    {shift.team_name && (
                      <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full mt-1 font-medium">
                        {shift.team_name}
                      </span>
                    )}
                    {!shift.team_name && (
                      <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 font-medium">
                        Yleinen
                      </span>
                    )}
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

      <AdminAIAssistant
        context="shifts"
        eventId={taskWithEvent?.events?.id}
        taskId={taskId}
        onSaved={fetchData}
      />
    </AdminLayout>
  )
}
