import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Event, Task, ShiftAvailability } from '../lib/database.types'
import RegistrationModal from '../components/RegistrationModal'
import { ArrowLeft, Calendar, MapPin, Clock, Users, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

interface TaskWithShifts extends Task {
  shifts: ShiftAvailability[]
  expanded?: boolean
}

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [tasks, setTasks] = useState<TaskWithShifts[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState<ShiftAvailability | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId!)
      .eq('is_active', true)
      .single()

    if (eventError || !eventData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setEvent(eventData as Event)

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('event_id', eventId!)
      .order('created_at')

    if (tasksData) {
      const tasksWithShifts = await Promise.all(
        (tasksData as Task[]).map(async (task) => {
          const { data: shiftsData } = await supabase
            .from('shift_availability')
            .select('*')
            .eq('task_id', task.id)
            .order('start_time')

          return {
            ...task,
            shifts: (shiftsData as ShiftAvailability[]) ?? [],
            expanded: true,
          }
        })
      )
      setTasks(tasksWithShifts)
    }

    setLoading(false)
  }

  function toggleTask(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, expanded: !t.expanded } : t))
  }

  function openRegistration(shift: ShiftAvailability, task: Task) {
    setSelectedShift(shift)
    setSelectedTask(task)
  }

  function closeRegistration() {
    setSelectedShift(null)
    setSelectedTask(null)
  }

  function onRegistrationSuccess() {
    fetchData() // päivitä paikkatilanne
    closeRegistration()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Tapahtumaa ei löydy</h2>
          <p className="text-gray-500 mb-4">Tapahtuma ei ole aktiivinen tai sitä ei ole olemassa.</p>
          <Link to="/" className="btn-primary">Takaisin etusivulle</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-3">
            <ArrowLeft size={18} />
            Takaisin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{event?.name}</h1>
          {event?.description && (
            <p className="text-gray-500 mt-1">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-3">
            {event && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar size={14} />
                {format(new Date(event.start_date), 'd.M.yyyy', { locale: fi })}
                {event.start_date !== event.end_date && (
                  <> – {format(new Date(event.end_date), 'd.M.yyyy', { locale: fi })}</>
                )}
              </div>
            )}
            {event?.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin size={14} />
                {event.location}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Tähän tapahtumaan ei ole vielä lisätty tehtäviä.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-700">
              Valitse tehtävä ja vuoro ({tasks.length} tehtävää)
            </h2>

            {tasks.map(task => (
              <div key={task.id} className="card p-0 overflow-hidden">
                {/* Tehtävä-header */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-start justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{task.name}</h3>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.min_age && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Ikäraja: {task.min_age}v
                        </span>
                      )}
                      {task.requires_drivers_license && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Vaatii: B-ajokortti
                        </span>
                      )}
                      {task.requires_tieturva && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                          Vaatii: Tieturva
                        </span>
                      )}
                      {task.requires_hygiene_passport && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Vaatii: Hygieniapassi
                        </span>
                      )}
                      {task.other_requirements && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Vaatii: {task.other_requirements}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-gray-400">
                    {task.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Vuorot */}
                {task.expanded && (
                  <div className="border-t border-gray-100">
                    {task.shifts.length === 0 ? (
                      <div className="px-6 py-4 text-sm text-gray-400">Ei vuoroja saatavilla</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {task.shifts.map(shift => (
                          <div
                            key={shift.shift_id}
                            className="flex items-center justify-between px-6 py-4"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <Clock size={15} className="text-gray-400" />
                                <span className="font-medium">
                                  {format(new Date(shift.start_time), 'EEEE d.M.', { locale: fi })}{' '}
                                  {format(new Date(shift.start_time), 'HH:mm', { locale: fi })}
                                  {' – '}
                                  {format(new Date(shift.end_time), 'HH:mm', { locale: fi })}
                                </span>
                              </div>
                              {shift.location && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                                  <MapPin size={13} />
                                  {shift.location}
                                </div>
                              )}
                              {shift.notes && (
                                <p className="text-xs text-gray-400 mt-0.5">{shift.notes}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 ml-4">
                              <div className="text-right">
                                <div className={`flex items-center gap-1 text-sm font-medium ${
                                  shift.available_spots === 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  <Users size={14} />
                                  {shift.available_spots === 0
                                    ? 'Täynnä'
                                    : `${shift.available_spots} paikkaa vapaana`}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {shift.confirmed_count}/{shift.max_participants} ilmoittautunut
                                </div>
                              </div>

                              <button
                                onClick={() => openRegistration(shift, task)}
                                disabled={shift.available_spots === 0}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  shift.available_spots === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {shift.available_spots === 0 ? 'Täynnä' : 'Ilmoittaudu'}
                              </button>
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
      </main>

      {/* Ilmoittautumismodaali */}
      {selectedShift && selectedTask && (
        <RegistrationModal
          shift={selectedShift}
          task={selectedTask}
          onClose={closeRegistration}
          onSuccess={onRegistrationSuccess}
        />
      )}
    </div>
  )
}
