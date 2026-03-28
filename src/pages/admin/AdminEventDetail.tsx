import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event } from '../../lib/database.types'
import { ArrowLeft, TableProperties, FileText, Settings } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fi } from 'date-fns/locale'

export default function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [shiftCount, setShiftCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, shiftsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase
        .from('shifts')
        .select('id, tasks!inner(event_id)', { count: 'exact', head: true })
        .eq('tasks.event_id', eventId!),
    ])
    if (eventRes.data) setEvent(eventRes.data as Event)
    setShiftCount(shiftsRes.count ?? 0)
    setLoading(false)
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
          <Link to="/admin/events" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{event?.name}</h2>
            {event && (
              <p className="text-sm text-gray-500">
                {format(parseISO(event.start_date), 'd.M.yyyy', { locale: fi })}
                {' – '}
                {format(parseISO(event.end_date), 'd.M.yyyy', { locale: fi })}
                {event.location && ` · ${event.location}`}
              </p>
            )}
          </div>
        </div>

        {/* Toimintokortit */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Vuorojen hallinta */}
          <Link
            to={`/admin/events/${eventId}/shifts`}
            className="card hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                <TableProperties size={22} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Hallitse vuoroja</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Taulukkonäkymä – lisää, muokkaa ja poista vuoroja. Luo tehtäviä ja joukkueita suoraan.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {shiftCount} vuoroa
                </p>
              </div>
            </div>
          </Link>

          {/* Tuntiraportti */}
          <Link
            to={`/admin/events/${eventId}/report`}
            className="card hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                <FileText size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Tuntiraportti</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Joukkueiden työtunnit, läsnäolot ja poissaolot. Lataa CSV-raportti.
                </p>
              </div>
            </div>
          </Link>

          {/* Kategoriat & tehtävät */}
          <Link
            to="/admin/categories"
            className="card hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                <Settings size={22} className="text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Kategoriat, tiimit & tehtävät</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Hallitse tehtävien vaatimuksia, kategorioita ja joukkueita.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}
