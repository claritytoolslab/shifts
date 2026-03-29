import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event, Task, Team, ShiftAvailability, Location } from '../../lib/database.types'
import { Plus, Trash2, Save, ArrowLeft, FileText, Filter, Check, X, Maximize2, Minimize2, ArrowUp, ArrowDown } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { fi } from 'date-fns/locale'

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

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

// Hae selaimen aikavyöhykkeen offset muodossa +HH:MM tai -HH:MM
function getTimezoneOffsetString(): string {
  const offset = new Date().getTimezoneOffset() // minuuteissa, esim -180 UTC+3:lle
  const sign = offset <= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const mins = String(absOffset % 60).padStart(2, '0')
  return `${sign}${hours}:${mins}`
}

type RowStatus = 'saved' | 'dirty' | 'new' | 'saving' | 'error'

interface ShiftRow {
  _id: string
  _status: RowStatus
  _error?: string
  taskId: string
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
  noShowCount: string
  confirmedCount: number
}

let tempIdCounter = 0
function tempId() {
  return `__new_${++tempIdCounter}`
}

export default function AdminShiftSpreadsheet() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [rows, setRows] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)

  const [fullscreen, setFullscreen] = useState(false)

  // Sorttaus
  type SortKey = 'task' | 'team' | 'start' | 'end' | 'maxParticipants' | 'location' | 'confirmed' | 'noShow'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Suodatus
  const [filterDay, setFilterDay] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterTask, setFilterTask] = useState('')

  // Inline-luonti
  const [creatingTask, setCreatingTask] = useState<string | null>(null) // row _id
  const [creatingTeam, setCreatingTeam] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')

  const eventDays = useMemo(() => {
    if (event?.start_date && event?.end_date) {
      return getDaysBetween(event.start_date, event.end_date)
    }
    return []
  }, [event])

  const defaultRow = useCallback((): ShiftRow => ({
    _id: tempId(),
    _status: 'new',
    taskId: tasks[0]?.id ?? '',
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
    noShowCount: '0',
    confirmedCount: 0,
  }), [tasks, eventDays])

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, tasksRes, teamsRes, locRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase.from('tasks').select('*').eq('event_id', eventId!).order('name'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('locations').select('*').eq('event_id', eventId!).order('name'),
    ])

    const ev = eventRes.data as Event | null
    const taskList = (tasksRes.data as Task[]) ?? []
    const teamList = (teamsRes.data as Team[]) ?? []
    const locList = (locRes.data as Location[]) ?? []

    setEvent(ev)
    setTasks(taskList)
    setTeams(teamList)
    setLocations(locList)

    // Hae kaikki vuorot tapahtuman tehtäville
    if (taskList.length > 0) {
      const taskIds = taskList.map(t => t.id)
      const { data: shiftsData } = await supabase
        .from('shift_availability')
        .select('*')
        .in('task_id', taskIds)
        .order('start_time')

      const shifts = (shiftsData as ShiftAvailability[]) ?? []
      setRows(shifts.map(s => shiftToRow(s)))
    } else {
      setRows([])
    }

    setLoading(false)
  }

  function shiftToRow(s: ShiftAvailability): ShiftRow {
    const st = new Date(s.start_time)
    const et = new Date(s.end_time)
    return {
      _id: s.shift_id,
      _status: 'saved',
      taskId: s.task_id,
      teamName: s.team_name ?? '',
      startDay: format(st, 'yyyy-MM-dd'),
      startHour: String(st.getHours()).padStart(2, '0'),
      startMinute: String(Math.floor(st.getMinutes() / 15) * 15).padStart(2, '0'),
      endDay: format(et, 'yyyy-MM-dd'),
      endHour: String(et.getHours()).padStart(2, '0'),
      endMinute: String(Math.floor(et.getMinutes() / 15) * 15).padStart(2, '0'),
      maxParticipants: String(s.max_participants),
      location: s.location ?? '',
      notes: s.notes ?? '',
      noShowCount: String(s.no_show_count ?? 0),
      confirmedCount: s.confirmed_count,
    }
  }

  function updateRow(id: string, field: keyof ShiftRow, value: string) {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r
      const updated = { ...r, [field]: value }
      if (r._status === 'saved') updated._status = 'dirty'

      // Kun alkuaikaa muutetaan, varmista ettei loppu jää taakse
      const isStartField = field === 'startDay' || field === 'startHour' || field === 'startMinute'
      if (isStartField) {
        if (updated.endDay < updated.startDay) {
          updated.endDay = updated.startDay
        }
        if (updated.endDay === updated.startDay) {
          if (updated.endHour < updated.startHour) {
            updated.endHour = updated.startHour
          }
          if (updated.endHour === updated.startHour && updated.endMinute < updated.startMinute) {
            updated.endMinute = updated.startMinute
          }
        }
      }

      return updated
    }))
  }

  function getEndDays(row: ShiftRow) {
    return eventDays.filter(d => d >= row.startDay)
  }

  // Samana päivänä tunnit/minuutit rajoitetaan, eri päivänä kaikki sallittu
  function getEndHours(row: ShiftRow) {
    if (row.endDay > row.startDay) return HOURS
    return HOURS.filter(h => h >= row.startHour)
  }
  function getEndMinutes(row: ShiftRow) {
    if (row.endDay > row.startDay) return MINUTES
    if (row.endHour > row.startHour) return MINUTES
    return MINUTES.filter(m => m >= row.startMinute)
  }

  function addRow() {
    setRows(prev => [...prev, defaultRow()])
  }

  function removeNewRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  async function saveRow(id: string) {
    const row = rows.find(r => r._id === id)
    if (!row) return

    // Validointi
    if (!row.taskId) {
      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: 'error' as RowStatus, _error: 'Valitse tehtävä' } : r))
      return
    }
    if (!row.maxParticipants || Number(row.maxParticipants) < 1) {
      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: 'error' as RowStatus, _error: 'Paikkoja vähintään 1' } : r))
      return
    }

    const tzOffset = getTimezoneOffsetString()
    const startTime = `${row.startDay}T${row.startHour}:${row.startMinute}:00${tzOffset}`
    const endTime = `${row.endDay}T${row.endHour}:${row.endMinute}:00${tzOffset}`
    if (startTime >= endTime) {
      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: 'error' as RowStatus, _error: 'Loppu ennen alkua' } : r))
      return
    }

    setRows(prev => prev.map(r => r._id === id ? { ...r, _status: 'saving' as RowStatus, _error: undefined } : r))

    const payload = {
      task_id: row.taskId,
      team_name: row.teamName || null,
      start_time: startTime,
      end_time: endTime,
      max_participants: Number(row.maxParticipants),
      location: row.location || null,
      notes: row.notes || null,
      no_show_count: Number(row.noShowCount) || 0,
    }

    let dbError
    const isNew = row._id.startsWith('__new_')
    if (isNew) {
      // Uusi rivi
      const { data, error } = await supabase.from('shifts').insert(payload).select('id').single()
      dbError = error
      if (data && !error) {
        setRows(prev => prev.map(r => r._id === id ? { ...r, _id: data.id, _status: 'saved' as RowStatus } : r))
        return
      }
    } else {
      // Päivitä
      const { error } = await supabase.from('shifts').update(payload).eq('id', row._id)
      dbError = error
    }

    if (dbError) {
      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: 'error' as RowStatus, _error: dbError.message } : r))
    } else {
      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: 'saved' as RowStatus, _error: undefined } : r))
    }
  }

  async function deleteRow(id: string) {
    const row = rows.find(r => r._id === id)
    if (!row) return

    if (row._id.startsWith('__new_')) {
      removeNewRow(id)
      return
    }

    if (!confirm('Haluatko varmasti poistaa tämän vuoron? Kaikki ilmoittautumiset poistetaan myös.')) return
    await supabase.from('shifts').delete().eq('id', row._id)
    setRows(prev => prev.filter(r => r._id !== id))
  }

  // Inline task creation
  async function createNewTask(rowId: string) {
    if (!newItemName.trim()) return
    const { data, error } = await supabase
      .from('tasks')
      .insert({ event_id: eventId!, name: newItemName.trim() })
      .select()
      .single()

    if (!error && data) {
      const newTask = data as Task
      setTasks(prev => [...prev, newTask].sort((a, b) => a.name.localeCompare(b.name)))
      updateRow(rowId, 'taskId', newTask.id)
    }
    setCreatingTask(null)
    setNewItemName('')
  }

  // Inline team creation
  async function createNewTeam(rowId: string) {
    if (!newItemName.trim()) return
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: newItemName.trim() })
      .select()
      .single()

    if (!error && data) {
      const newTeam = data as Team
      setTeams(prev => [...prev, newTeam].sort((a, b) => a.name.localeCompare(b.name)))
      updateRow(rowId, 'teamName', newTeam.name)
    }
    setCreatingTeam(null)
    setNewItemName('')
  }

  // Tehtävänimien map sorttausta varten
  const taskNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    tasks.forEach(t => { m[t.id] = t.name })
    return m
  }, [tasks])

  // Suodatetut ja sortatut rivit
  const filteredRows = useMemo(() => {
    let result = rows.filter(r => {
      if (filterDay && r.startDay !== filterDay) return false
      if (filterTeam === '__general__' && r.teamName !== '') return false
      if (filterTeam && filterTeam !== '__general__' && r.teamName !== filterTeam) return false
      if (filterTask && r.taskId !== filterTask) return false
      return true
    })

    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        let cmp = 0
        switch (sortKey) {
          case 'task':
            cmp = (taskNameMap[a.taskId] ?? '').localeCompare(taskNameMap[b.taskId] ?? '')
            break
          case 'team':
            cmp = (a.teamName || 'Yleinen').localeCompare(b.teamName || 'Yleinen')
            break
          case 'start':
            cmp = `${a.startDay}T${a.startHour}:${a.startMinute}`.localeCompare(`${b.startDay}T${b.startHour}:${b.startMinute}`)
            break
          case 'end':
            cmp = `${a.endDay}T${a.endHour}:${a.endMinute}`.localeCompare(`${b.endDay}T${b.endHour}:${b.endMinute}`)
            break
          case 'maxParticipants':
            cmp = Number(a.maxParticipants) - Number(b.maxParticipants)
            break
          case 'location':
            cmp = (a.location || '').localeCompare(b.location || '')
            break
          case 'confirmed':
            cmp = a.confirmedCount - b.confirmedCount
            break
          case 'noShow':
            cmp = Number(a.noShowCount) - Number(b.noShowCount)
            break
        }
        return cmp * dir
      })
    }

    return result
  }, [rows, filterDay, filterTeam, filterTask, sortKey, sortDir, taskNameMap])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  const content = (
    <div>
      {/* Otsikko */}
      <div className="flex items-center gap-2 mb-4">
        <Link to={`/admin/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{event?.name}</h2>
          <p className="text-sm text-gray-500">Vuorojen hallinta – taulukkonäkymä</p>
        </div>
        <button
          onClick={() => setFullscreen(f => !f)}
          className="btn-secondary flex items-center gap-2 text-sm"
          title={fullscreen ? 'Pienennä' : 'Koko näyttö'}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {fullscreen ? 'Pienennä' : 'Koko näyttö'}
        </button>
        <Link
          to={`/admin/events/${eventId}/report`}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <FileText size={16} />
          Tuntiraportti
        </Link>
      </div>

        {/* Suodatus */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-gray-50 rounded-xl p-3">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterDay}
            onChange={e => setFilterDay(e.target.value)}
            className="input !w-auto text-sm"
          >
            <option value="">Kaikki päivät</option>
            {eventDays.map(d => (
              <option key={d} value={d}>{format(parseISO(d), 'EEE d.M.', { locale: fi })}</option>
            ))}
          </select>
          <select
            value={filterTask}
            onChange={e => setFilterTask(e.target.value)}
            className="input !w-auto text-sm"
          >
            <option value="">Kaikki tehtävät</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="input !w-auto text-sm"
          >
            <option value="">Kaikki joukkueet</option>
            <option value="__general__">Yleinen (ei joukkuetta)</option>
            {teams.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
          {(filterDay || filterTask || filterTeam) && (
            <button
              onClick={() => { setFilterDay(''); setFilterTask(''); setFilterTeam('') }}
              className="text-xs text-blue-600 hover:underline"
            >
              Tyhjennä
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filteredRows.length} / {rows.length} vuoroa</span>
        </div>

        {/* Taulukko */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {([
                  { key: 'task' as SortKey, label: 'Tehtävä *', minW: '160px' },
                  { key: 'team' as SortKey, label: 'Joukkue', minW: '130px' },
                  { key: 'start' as SortKey, label: 'Alku', minW: '200px' },
                  { key: 'end' as SortKey, label: 'Loppu', minW: '200px' },
                  { key: 'maxParticipants' as SortKey, label: 'Paikkoja', minW: '70px' },
                  { key: 'location' as SortKey, label: 'Sijainti', minW: '120px' },
                  { key: null as SortKey | null, label: 'Lisätiedot', minW: '120px' },
                  { key: 'confirmed' as SortKey, label: 'Ilm.', minW: '60px' },
                  { key: 'noShow' as SortKey, label: 'Poissa', minW: '60px' },
                ] as const).map(({ key, label, minW }) => (
                  <th
                    key={label}
                    className={`text-left px-2 py-2 font-semibold text-gray-700 select-none ${key ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    style={{ minWidth: minW }}
                    onClick={() => key && toggleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {sortKey === key && (
                        sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-2 min-w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr
                  key={row._id}
                  className={`border-b border-gray-100 hover:bg-gray-50/50 ${
                    row._status === 'new' ? 'border-l-4 border-l-blue-400' :
                    row._status === 'dirty' ? 'border-l-4 border-l-yellow-400' :
                    row._status === 'error' ? 'border-l-4 border-l-red-400' :
                    row._status === 'saving' ? 'border-l-4 border-l-gray-300 opacity-60' :
                    'border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Tehtävä */}
                  <td className="px-2 py-1.5">
                    {creatingTask === row._id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') createNewTask(row._id)
                            if (e.key === 'Escape') { setCreatingTask(null); setNewItemName('') }
                          }}
                          className="input !py-1 text-sm flex-1"
                          placeholder="Tehtävän nimi"
                        />
                        <button onClick={() => createNewTask(row._id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14} /></button>
                        <button onClick={() => { setCreatingTask(null); setNewItemName('') }} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <select
                        value={row.taskId}
                        onChange={e => {
                          if (e.target.value === '__new__') {
                            setCreatingTask(row._id)
                            setNewItemName('')
                          } else {
                            updateRow(row._id, 'taskId', e.target.value)
                          }
                        }}
                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                      >
                        <option value="">— Valitse —</option>
                        {tasks.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        <option value="__new__">+ Uusi tehtävä...</option>
                      </select>
                    )}
                  </td>

                  {/* Joukkue */}
                  <td className="px-2 py-1.5">
                    {creatingTeam === row._id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') createNewTeam(row._id)
                            if (e.key === 'Escape') { setCreatingTeam(null); setNewItemName('') }
                          }}
                          className="input !py-1 text-sm flex-1"
                          placeholder="Joukkueen nimi"
                        />
                        <button onClick={() => createNewTeam(row._id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14} /></button>
                        <button onClick={() => { setCreatingTeam(null); setNewItemName('') }} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <select
                        value={row.teamName}
                        onChange={e => {
                          if (e.target.value === '__new__') {
                            setCreatingTeam(row._id)
                            setNewItemName('')
                          } else {
                            updateRow(row._id, 'teamName', e.target.value)
                          }
                        }}
                        className="w-full border border-gray-200 rounded px-1.5 py-1 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                      >
                        <option value="">Yleinen</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                        <option value="__new__">+ Uusi joukkue...</option>
                      </select>
                    )}
                  </td>

                  {/* Alku */}
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <select
                        value={row.startDay}
                        onChange={e => updateRow(row._id, 'startDay', e.target.value)}
                        className="border border-gray-200 rounded px-1 py-1 text-sm focus:border-blue-400 outline-none"
                      >
                        {eventDays.map(d => (
                          <option key={d} value={d}>{format(parseISO(d), 'EEE d.M.', { locale: fi })}</option>
                        ))}
                      </select>
                      <select
                        value={row.startHour}
                        onChange={e => updateRow(row._id, 'startHour', e.target.value)}
                        className="border border-gray-200 rounded px-1 py-1 text-sm w-14 focus:border-blue-400 outline-none"
                      >
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={row.startMinute}
                        onChange={e => updateRow(row._id, 'startMinute', e.target.value)}
                        className="border border-gray-200 rounded px-1 py-1 text-sm w-14 focus:border-blue-400 outline-none"
                      >
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </td>

                  {/* Loppu */}
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <select
                        value={row.endDay}
                        onChange={e => updateRow(row._id, 'endDay', e.target.value)}
                        className="border border-gray-200 rounded px-1 py-1 text-sm focus:border-blue-400 outline-none"
                      >
                        {getEndDays(row).map(d => (
                          <option key={d} value={d}>{format(parseISO(d), 'EEE d.M.', { locale: fi })}</option>
                        ))}
                      </select>
                      <select
                        value={row.endHour}
                        onChange={e => updateRow(row._id, 'endHour', e.target.value)}
                        className="border border-gray-200 rounded px-1 py-1 text-sm w-14 focus:border-blue-400 outline-none"
                      >
                        {getEndHours(row).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select
                        value={row.endMinute}
                        onChange={e => updateRow(row._id, 'endMinute', e.target.value)}
                        className="border border-gray-200 rounded px-1 py-1 text-sm w-14 focus:border-blue-400 outline-none"
                      >
                        {getEndMinutes(row).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </td>

                  {/* Paikkoja */}
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={1}
                      value={row.maxParticipants}
                      onChange={e => updateRow(row._id, 'maxParticipants', e.target.value)}
                      className="w-16 border border-gray-200 rounded px-1.5 py-1 text-sm focus:border-blue-400 outline-none"
                    />
                  </td>

                  {/* Sijainti */}
                  <td className="px-2 py-1.5">
                    <select
                      value={row.location}
                      onChange={e => updateRow(row._id, 'location', e.target.value)}
                      className="w-full border border-gray-200 rounded px-1.5 py-1 text-sm focus:border-blue-400 outline-none"
                    >
                      <option value="">Valitse sijainti</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Lisätiedot */}
                  <td className="px-2 py-1.5">
                    <input
                      value={row.notes}
                      onChange={e => updateRow(row._id, 'notes', e.target.value)}
                      className="w-full border border-gray-200 rounded px-1.5 py-1 text-sm focus:border-blue-400 outline-none"
                      placeholder="Lisätiedot"
                    />
                  </td>

                  {/* Ilmoittautuneet */}
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-sm font-medium ${
                      row.confirmedCount >= Number(row.maxParticipants) ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {row._id.startsWith('__new_') ? '–' : `${row.confirmedCount}/${row.maxParticipants}`}
                    </span>
                  </td>

                  {/* Poissa */}
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={row.confirmedCount}
                      value={row.noShowCount}
                      onChange={e => updateRow(row._id, 'noShowCount', e.target.value)}
                      className="w-14 border border-gray-200 rounded px-1.5 py-1 text-sm focus:border-blue-400 outline-none"
                    />
                  </td>

                  {/* Toiminnot */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {(row._status === 'new' || row._status === 'dirty' || row._status === 'error') && (
                        <button
                          onClick={() => saveRow(row._id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Tallenna"
                        >
                          <Save size={15} />
                        </button>
                      )}
                      {row._status === 'saved' && (
                        <span className="p-1.5 text-green-500" title="Tallennettu">
                          <Check size={15} />
                        </span>
                      )}
                      {row._status === 'saving' && (
                        <span className="p-1.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </span>
                      )}
                      <button
                        onClick={() => deleteRow(row._id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Poista"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {row._error && (
                      <p className="text-xs text-red-500 mt-0.5">{row._error}</p>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
                    {rows.length === 0 ? 'Ei vuoroja. Lisää ensimmäinen rivi!' : 'Ei vuoroja valituilla suodattimilla.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      {/* Lisää rivi */}
      <div className="mt-3">
        <button
          onClick={addRow}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Lisää rivi
        </button>
      </div>
    </div>
  )

  if (fullscreen) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        {content}
      </div>
    )
  }

  return <AdminLayout>{content}</AdminLayout>
}
