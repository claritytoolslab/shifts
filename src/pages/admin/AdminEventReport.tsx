import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event, Task, ShiftAvailability } from '../../lib/database.types'
import { ArrowLeft, Download, Users, Clock, CalendarDays } from 'lucide-react'

interface ShiftWithTask extends ShiftAvailability {
  taskName: string
}

interface TeamReport {
  teamName: string
  shiftCount: number
  totalRegistered: number
  totalNoShow: number
  totalPresent: number
  totalHours: number // tuntia yhteensä (kesto * läsnä)
}

export default function AdminEventReport() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [shifts, setShifts] = useState<ShiftWithTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, tasksRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase.from('tasks').select('*').eq('event_id', eventId!),
    ])

    const ev = eventRes.data as Event | null
    const taskList = (tasksRes.data as Task[]) ?? []
    setEvent(ev)

    if (taskList.length > 0) {
      const taskIds = taskList.map(t => t.id)
      const taskMap: Record<string, string> = {}
      taskList.forEach(t => { taskMap[t.id] = t.name })

      const { data: shiftsData } = await supabase
        .from('shift_availability')
        .select('*')
        .in('task_id', taskIds)
        .order('start_time')

      const allShifts = ((shiftsData as ShiftAvailability[]) ?? []).map(s => ({
        ...s,
        taskName: taskMap[s.task_id] ?? '?',
      }))
      setShifts(allShifts)
    }

    setLoading(false)
  }

  function getShiftDurationHours(s: ShiftAvailability): number {
    const start = new Date(s.start_time).getTime()
    const end = new Date(s.end_time).getTime()
    return (end - start) / (1000 * 60 * 60)
  }

  const teamReports = useMemo((): TeamReport[] => {
    const map: Record<string, TeamReport> = {}

    shifts.forEach(s => {
      const key = s.team_name || 'Yleinen'
      if (!map[key]) {
        map[key] = {
          teamName: key,
          shiftCount: 0,
          totalRegistered: 0,
          totalNoShow: 0,
          totalPresent: 0,
          totalHours: 0,
        }
      }
      const r = map[key]
      const noShow = s.no_show_count ?? 0
      const present = Math.max(0, s.confirmed_count - noShow)
      const durationH = getShiftDurationHours(s)

      r.shiftCount++
      r.totalRegistered += s.confirmed_count
      r.totalNoShow += noShow
      r.totalPresent += present
      r.totalHours += durationH * present
    })

    return Object.values(map).sort((a, b) => a.teamName.localeCompare(b.teamName))
  }, [shifts])

  const totals = useMemo(() => {
    return teamReports.reduce(
      (acc, r) => ({
        shiftCount: acc.shiftCount + r.shiftCount,
        totalRegistered: acc.totalRegistered + r.totalRegistered,
        totalNoShow: acc.totalNoShow + r.totalNoShow,
        totalPresent: acc.totalPresent + r.totalPresent,
        totalHours: acc.totalHours + r.totalHours,
      }),
      { shiftCount: 0, totalRegistered: 0, totalNoShow: 0, totalPresent: 0, totalHours: 0 }
    )
  }, [teamReports])

  function downloadCSV() {
    const BOM = '\uFEFF'
    const header = 'Joukkue;Vuoroja;Ilmoittautuneet;Poissa;Läsnä;Työtunnit yhteensä'
    const rows = teamReports.map(r =>
      `${r.teamName};${r.shiftCount};${r.totalRegistered};${r.totalNoShow};${r.totalPresent};${r.totalHours.toFixed(1)}`
    )
    rows.push(`YHTEENSÄ;${totals.shiftCount};${totals.totalRegistered};${totals.totalNoShow};${totals.totalPresent};${totals.totalHours.toFixed(1)}`)

    const csv = BOM + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tuntiraportti-${event?.name?.replace(/\s+/g, '_') ?? 'tapahtuma'}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        {/* Otsikko */}
        <div className="flex items-center gap-2 mb-6">
          <Link to={`/admin/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{event?.name}</h2>
            <p className="text-sm text-gray-500">Tuntiraportti – joukkueiden työtunnit</p>
          </div>
          <button
            onClick={downloadCSV}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            Lataa CSV
          </button>
        </div>

        {/* Yhteenvetokortit */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CalendarDays size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totals.shiftCount}</p>
              <p className="text-xs text-gray-500">Vuoroja</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Users size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totals.totalPresent}</p>
              <p className="text-xs text-gray-500">Läsnä yhteensä</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totals.totalHours.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Työtuntia yhteensä</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Users size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totals.totalNoShow}</p>
              <p className="text-xs text-gray-500">Poissaoloja</p>
            </div>
          </div>
        </div>

        {/* Joukkuetaulukko */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Joukkue</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Vuoroja</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Ilmoittautuneet</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Poissa</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Läsnä</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Työtunnit yht.</th>
              </tr>
            </thead>
            <tbody>
              {teamReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    Ei vuoroja tässä tapahtumassa.
                  </td>
                </tr>
              ) : (
                <>
                  {teamReports.map(r => (
                    <tr key={r.teamName} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.teamName === 'Yleinen' ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            {r.teamName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                            {r.teamName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.shiftCount}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.totalRegistered}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{r.totalNoShow || '–'}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{r.totalPresent}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{r.totalHours.toFixed(1)} h</td>
                    </tr>
                  ))}
                  {/* Yhteensä-rivi */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-gray-900">Yhteensä</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totals.shiftCount}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totals.totalRegistered}</td>
                    <td className="px-4 py-3 text-right text-red-700">{totals.totalNoShow || '–'}</td>
                    <td className="px-4 py-3 text-right text-green-700">{totals.totalPresent}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totals.totalHours.toFixed(1)} h</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
