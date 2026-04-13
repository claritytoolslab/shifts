import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Event, Task, ShiftAvailability } from '../lib/database.types'
import RegistrationModal from '../components/RegistrationModal'
import { ArrowLeft, Calendar, MapPin, Clock, Users, ChevronDown, ChevronUp, AlertCircle, ChevronRight, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

interface TaskWithShifts extends Task {
  shifts: ShiftAvailability[]
  expanded?: boolean
}

type ViewMode = 'groups' | 'tasks'

// Ryhmätyyppi: category (yleinen) tai team (joukkue)
interface Group {
  type: 'category' | 'team'
  value: string
}

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [tasks, setTasks] = useState<TaskWithShifts[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState<ShiftAvailability | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [view, setView] = useState<ViewMode>('groups')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedDay, setSelectedDay] = useState('')

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
      .order('name')

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

  // Yleiset tehtävät: vuorot joilla ei ole team_name → ryhmitellään kategorian mukaan
  const categoryGroups = useMemo(() => {
    const groups: Record<string, TaskWithShifts[]> = {}
    tasks.forEach(task => {
      const openShifts = task.shifts.filter(s => !s.team_name)
      if (openShifts.length === 0) return
      const key = task.category || 'Yleiset tehtävät'
      if (!groups[key]) groups[key] = []
      groups[key].push({ ...task, shifts: openShifts })
    })
    return groups
  }, [tasks])

  // Joukkuekohtaiset tehtävät: vuorot joilla on team_name → ryhmitellään joukkueen mukaan
  const teamGroups = useMemo(() => {
    const groups: Record<string, TaskWithShifts[]> = {}
    tasks.forEach(task => {
      const teamShifts = task.shifts.filter(s => s.team_name)
      teamShifts.forEach(shift => {
        const key = shift.team_name!
        if (!groups[key]) groups[key] = []
        // Lisää tehtävä ko. joukkueen alle (yhdellä vuorolla)
        const existing = groups[key].find(t => t.id === task.id)
        if (existing) {
          existing.shifts.push(shift)
        } else {
          groups[key].push({ ...task, shifts: [shift] })
        }
      })
    })
    return groups
  }, [tasks])

  // Tehtävät valitulle ryhmälle
  const tasksForSelectedGroup = useMemo(() => {
    if (!selectedGroup) return []
    const groupTasks = selectedGroup.type === 'category'
      ? (categoryGroups[selectedGroup.value] ?? [])
      : (teamGroups[selectedGroup.value] ?? [])

    return groupTasks.map(task => {
      let shifts = task.shifts
      if (selectedDay) {
        shifts = shifts.filter(s =>
          format(new Date(s.start_time), 'yyyy-MM-dd') === selectedDay
        )
      }
      return { ...task, shifts }
    }).filter(task => !selectedDay || task.shifts.length > 0)
  }, [selectedGroup, categoryGroups, teamGroups, selectedDay])

  // Uniikit päivät valitun ryhmän vuoroista
  const availableDays = useMemo(() => {
    if (!selectedGroup) return []
    const groupTasks = selectedGroup.type === 'category'
      ? (categoryGroups[selectedGroup.value] ?? [])
      : (teamGroups[selectedGroup.value] ?? [])
    const days = new Set<string>()
    groupTasks.forEach(task => {
      task.shifts.forEach(shift => {
        days.add(format(new Date(shift.start_time), 'yyyy-MM-dd'))
      })
    })
    return Array.from(days).sort()
  }, [selectedGroup, categoryGroups, teamGroups])

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
    fetchData()
    closeRegistration()
  }

  function selectGroup(type: 'category' | 'team', value: string) {
    setSelectedGroup({ type, value })
    setSelectedDay('')
    setView('tasks')
  }

  function backToGroups() {
    setView('groups')
    setSelectedGroup(null)
    setSelectedDay('')
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

  function TaskCard({ task }: { task: TaskWithShifts }) {
    return (
      <div className="card p-0 overflow-hidden">
        <button
          onClick={() => toggleTask(task.id)}
          className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{task.name}</h3>
            {task.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {task.min_age && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {task.min_age}v+
                </span>
              )}
              {task.requires_pelinohjauskoulutus && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Pelinohjauskoulutus</span>
              )}
              {task.requires_ea1 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">EA1</span>
              )}
              {task.requires_ajokortti && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">B-ajokortti + ajolupa</span>
              )}
              {task.requires_jarjestyksenvalvontakortti && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Järjestyksenvalvontakortti</span>
              )}
              {task.other_requirements && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{task.other_requirements}</span>
              )}
            </div>
          </div>
          <div className="ml-3 text-gray-400 shrink-0 mt-0.5">
            {task.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {task.expanded && (
          <div className="border-t border-gray-100">
            {task.shifts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">Ei vuoroja saatavilla</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {task.shifts.map(shift => (
                  <div key={shift.shift_id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Clock size={13} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-medium">
                            {format(new Date(shift.start_time), 'EEEE d.M.', { locale: fi })}{' '}
                            {format(new Date(shift.start_time), 'HH:mm')}{' – '}
                            {format(new Date(shift.end_time), 'HH:mm')}
                          </span>
                        </div>
                        {shift.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 ml-5">
                            <MapPin size={11} />
                            {shift.location}
                          </div>
                        )}
                        <div className={`flex items-center gap-1 text-xs font-medium mt-1 ml-5 ${
                          shift.available_spots === 0 ? 'text-red-500' : 'text-green-600'
                        }`}>
                          <Users size={12} />
                          {shift.available_spots === 0
                            ? 'Täynnä'
                            : `${shift.available_spots} paikkaa vapaana`}
                          <span className="text-gray-400 font-normal">
                            ({shift.confirmed_count}/{shift.max_participants})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openRegistration(shift, task)}
                        disabled={shift.available_spots === 0}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          shift.available_spots === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
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
    )
  }

  // --- RYHMÄVALINTANÄKYMÄ ---
  if (view === 'groups') {
    const categoryKeys = Object.keys(categoryGroups)
    const teamKeys = Object.keys(teamGroups)
    const totalGroups = categoryKeys.length + teamKeys.length

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Link to="/" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-3 text-sm">
              <ArrowLeft size={16} />
              Takaisin
            </Link>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{event?.name}</h1>
            {event?.description && (
              <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {event && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar size={12} />
                  {format(new Date(event.start_date), 'd.M.yyyy', { locale: fi })}
                  {event.start_date !== event.end_date && (
                    <> – {format(new Date(event.end_date), 'd.M.yyyy', { locale: fi })}</>
                  )}
                </div>
              )}
              {event?.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  {event.location}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {totalGroups === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Tähän tapahtumaan ei ole vielä lisätty vuoroja.</p>
            </div>
          ) : (
            <>
              {/* Kategoriat (yleiset vuorot) */}
              {categoryKeys.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                    Yleiset tehtävät
                  </h2>
                  <div className="space-y-2">
                    {categoryKeys.map(cat => {
                      const catTasks = categoryGroups[cat]
                      const totalSpots = catTasks.reduce((sum, t) => sum + t.shifts.reduce((s, shift) => s + shift.max_participants, 0), 0)
                      const freeSpots = catTasks.reduce((sum, t) => sum + t.shifts.reduce((s, shift) => s + shift.available_spots, 0), 0)
                      return (
                        <button
                          key={cat}
                          onClick={() => selectGroup('category', cat)}
                          className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md active:bg-gray-50 transition-all text-left"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">{cat}</div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {catTasks.length} tehtävää
                              {totalSpots > 0 && (
                                <> · <span className={freeSpots > 0 ? 'text-green-600' : 'text-red-500'}>
                                  {freeSpots}/{totalSpots} paikkaa vapaana
                                </span></>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-400 shrink-0 ml-3" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Joukkueet */}
              {teamKeys.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                    Joukkuekohtaiset tehtävät
                  </h2>
                  <div className="space-y-2">
                    {teamKeys.map(team => {
                      const teamTaskList = teamGroups[team]
                      const totalSpots = teamTaskList.reduce((sum, t) => sum + t.shifts.reduce((s, shift) => s + shift.max_participants, 0), 0)
                      const freeSpots = teamTaskList.reduce((sum, t) => sum + t.shifts.reduce((s, shift) => s + shift.available_spots, 0), 0)
                      return (
                        <button
                          key={team}
                          onClick={() => selectGroup('team', team)}
                          className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md active:bg-gray-50 transition-all text-left"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">{team}</div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {teamTaskList.length} tehtävää
                              {totalSpots > 0 && (
                                <> · <span className={freeSpots > 0 ? 'text-green-600' : 'text-red-500'}>
                                  {freeSpots}/{totalSpots} paikkaa vapaana
                                </span></>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-400 shrink-0 ml-3" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    )
  }

  // --- TEHTÄVÄLISTANÄKYMÄ ---
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={backToGroups}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-3 text-sm"
          >
            <ArrowLeft size={16} />
            {event?.name}
          </button>
          <h1 className="text-xl font-bold text-gray-900">{selectedGroup?.value}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Päiväsuodatin */}
        {availableDays.length >= 1 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <button
              onClick={() => setSelectedDay('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedDay ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Kaikki
            </button>
            {availableDays.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDay === day ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {format(new Date(day), 'EEE d.M.', { locale: fi })}
              </button>
            ))}
          </div>
        )}

        {tasksForSelectedGroup.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Ei tehtäviä valituilla suodattimilla.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasksForSelectedGroup.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </main>

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
