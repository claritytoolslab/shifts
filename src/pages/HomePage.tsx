import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Event } from '../lib/database.types'
import { Calendar, MapPin, ChevronRight, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_date')
      if (data) setEvents(data as Event[])
      setLoading(false)
    }
    fetchEvents()
  }, [])

  function handleGo() {
    if (selected) navigate(`/event/${selected}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vuorovaraus</h1>
            <p className="text-sm text-gray-500">Ilmoittaudu vapaaehtoistapahtumiin</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/palaute"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Palaute
            </Link>
            <a
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Hallintapaneeli →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ilmoittaudu vuoroon
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Valitse tapahtuma alta ja selaa vapaita vuoroja. Ilmoittautuminen on nopeaa ja helppoa.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Ei aktiivisia tapahtumia tällä hetkellä.</p>
          </div>
        ) : (
          <>
            {/* Dropdown-valinta */}
            <div className="card max-w-xl mx-auto mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Valitse tapahtuma</h3>
              <div className="flex gap-3">
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="input flex-1"
                >
                  <option value="">-- Valitse tapahtuma --</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGo}
                  disabled={!selected}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                  Siirry
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Tapahtumakorttilista */}
            <div className="grid gap-4 md:grid-cols-2">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="card text-left hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {event.name}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex flex-col gap-1 mt-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Calendar size={14} />
                          {format(new Date(event.start_date), 'd.M.yyyy', { locale: fi })}
                          {event.start_date !== event.end_date && (
                            <> – {format(new Date(event.end_date), 'd.M.yyyy', { locale: fi })}</>
                          )}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin size={14} />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600 mt-1 ml-4 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
