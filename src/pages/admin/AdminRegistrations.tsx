import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Registration } from '../../lib/database.types'
import { Search, Download } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

interface RegistrationWithDetails extends Registration {
  shifts: {
    start_time: string
    end_time: string
    tasks: {
      name: string
      events: {
        name: string
      }
    }
  }
}

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchRegistrations()
  }, [])

  async function fetchRegistrations() {
    const { data } = await supabase
      .from('registrations')
      .select(`
        *,
        shifts (
          start_time,
          end_time,
          tasks (
            name,
            events (
              name
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (data) setRegistrations(data as RegistrationWithDetails[])
    setLoading(false)
  }

  const filtered = registrations.filter(reg => {
    const matchSearch = search === '' || [
      reg.first_name, reg.last_name, reg.email, reg.phone
    ].some(v => v.toLowerCase().includes(search.toLowerCase()))

    const matchStatus = statusFilter === 'all' || reg.status === statusFilter

    return matchSearch && matchStatus
  })

  function exportCSV() {
    const headers = ['Nimi', 'Sähköposti', 'Puhelin', 'Tapahtuma', 'Tehtävä', 'Vuoro', 'Status', 'Ilmoittautumisaika']
    const rows = filtered.map(reg => [
      `${reg.first_name} ${reg.last_name}`,
      reg.email,
      reg.phone,
      reg.shifts?.tasks?.events?.name ?? '',
      reg.shifts?.tasks?.name ?? '',
      reg.shifts ? `${format(new Date(reg.shifts.start_time), 'dd.MM.yyyy HH:mm')} - ${format(new Date(reg.shifts.end_time), 'HH:mm')}` : '',
      reg.status,
      format(new Date(reg.created_at), 'dd.MM.yyyy HH:mm'),
    ])

    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ilmoittautumiset-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Ilmoittautumiset</h2>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            Vie CSV
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Hae nimellä, sähköpostilla tai puhelimella..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input w-48"
          >
            <option value="all">Kaikki tilat</option>
            <option value="confirmed">Vahvistettu</option>
            <option value="waitlisted">Jonossa</option>
            <option value="cancelled">Peruutettu</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Ei ilmoittautumisia.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ilmoittautuja</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tapahtuma / Tehtävä</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vuoro</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pätevyydet</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tila</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ilmoittautui</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg) => (
                    <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{reg.first_name} {reg.last_name}</div>
                        <div className="text-gray-500">{reg.email}</div>
                        <div className="text-gray-500">{reg.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{reg.shifts?.tasks?.events?.name}</div>
                        <div className="text-gray-500">{reg.shifts?.tasks?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {reg.shifts && (
                          <>
                            <div>{format(new Date(reg.shifts.start_time), 'dd.MM.yyyy', { locale: fi })}</div>
                            <div className="text-gray-500">
                              {format(new Date(reg.shifts.start_time), 'HH:mm', { locale: fi })} –{' '}
                              {format(new Date(reg.shifts.end_time), 'HH:mm', { locale: fi })}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {reg.has_drivers_license && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti</span>
                          )}
                          {reg.has_tieturva && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Tieturva</span>
                          )}
                          {reg.has_hygiene_passport && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hygieniapassi</span>
                          )}
                          {!reg.has_drivers_license && !reg.has_tieturva && !reg.has_hygiene_passport && (
                            <span className="text-gray-400">–</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(reg.created_at), 'dd.MM.yyyy HH:mm', { locale: fi })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              {filtered.length} ilmoittautumista
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
