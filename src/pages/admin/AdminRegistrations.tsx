import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Registration } from '../../lib/database.types'
import { Search, Download, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

interface RegistrationWithDetails extends Registration {
  shifts: {
    start_time: string
    end_time: string
    location: string | null
    tasks: {
      name: string
      events: {
        name: string
      }
    }
  }
}

type SortKey = 'name' | 'event' | 'task' | 'shift' | 'status' | 'location' | 'is_present' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [taskFilter, setTaskFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [isPresentFilter, setIsPresentFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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
          location,
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

  const uniqueEvents = [...new Set(registrations.map(r => r.shifts?.tasks?.events?.name).filter(Boolean))] as string[]
  const uniqueTasks = [...new Set(registrations.map(r => r.shifts?.tasks?.name).filter(Boolean))] as string[]
  const uniqueDates = [...new Set(registrations.map(r => r.shifts ? format(new Date(r.shifts.start_time), 'dd.MM.yyyy') : null).filter(Boolean))] as string[]
  const uniqueLocations = [...new Set(registrations.map(r => r.shifts?.location).filter(Boolean))] as string[]

  const filtered = registrations.filter(reg => {
    const matchSearch = search === '' || [
      reg.first_name, reg.last_name, reg.email, reg.phone
    ].some(v => v.toLowerCase().includes(search.toLowerCase()))

    const matchStatus = statusFilter === 'all' || reg.status === statusFilter
    const matchEvent = eventFilter === 'all' || reg.shifts?.tasks?.events?.name === eventFilter
    const matchTask = taskFilter === 'all' || reg.shifts?.tasks?.name === taskFilter
    const matchDate = dateFilter === 'all' || (reg.shifts && format(new Date(reg.shifts.start_time), 'dd.MM.yyyy') === dateFilter)
    const matchLocation = locationFilter === 'all' || reg.shifts?.location === locationFilter
    const matchIsPresent = isPresentFilter === 'all' ||
      (isPresentFilter === 'present' && reg.is_present === true) ||
      (isPresentFilter === 'not_present' && reg.is_present === false)

    return matchSearch && matchStatus && matchEvent && matchTask && matchDate && matchLocation && matchIsPresent
  })

  function getSortValue(reg: RegistrationWithDetails, key: SortKey): string {
    switch (key) {
      case 'name': return `${reg.first_name} ${reg.last_name}`.toLowerCase()
      case 'event': return (reg.shifts?.tasks?.events?.name ?? '').toLowerCase()
      case 'task': return (reg.shifts?.tasks?.name ?? '').toLowerCase()
      case 'shift': return reg.shifts?.start_time ?? ''
      case 'status': return reg.status
      case 'location': return (reg.shifts?.location ?? '').toLowerCase()
      case 'is_present': return reg.is_present ? 'z' : 'a' // z=present, a=not present (reverse alphabetical for desc)
      case 'created_at': return reg.created_at
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const aVal = getSortValue(a, sortKey)
    const bVal = getSortValue(b, sortKey)
    const cmp = aVal.localeCompare(bVal)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown size={14} className="text-gray-400" />
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  async function handleTogglePresent(registrationId: string) {
    const reg = registrations.find(r => r.id === registrationId)
    if (!reg) return

    const newIsPresent = !reg.is_present
    setRegistrations(prev =>
      prev.map(r => r.id === registrationId ? { ...r, is_present: newIsPresent } : r)
    )

    const { error } = await supabase
      .from('registrations')
      .update({ is_present: newIsPresent })
      .eq('id', registrationId)

    if (error) {
      setRegistrations(prev =>
        prev.map(r => r.id === registrationId ? { ...r, is_present: reg.is_present } : r)
      )
      alert(`Virhe: ${error.message}`)
    }
  }

  async function handleDelete(registrationId: string, personName: string) {
    if (!confirm(`Poista ${personName} ilmoittautumisesta? Tätä ei voi perua.`)) {
      return
    }

    setRegistrations(prev => prev.filter(r => r.id !== registrationId))

    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId)

    if (error) {
      fetchRegistrations()
      alert(`Virhe poistettaessa: ${error.message}`)
    }
  }

  function exportCSV() {
    const headers = ['Nimi', 'Sähköposti', 'Puhelin', 'Tapahtuma', 'Tehtävä', 'Vuoro', 'Status', 'Läsnä', 'Ilmoittautumisaika']
    const rows = filtered.map(reg => [
      `${reg.first_name} ${reg.last_name}`,
      reg.email,
      reg.phone,
      reg.shifts?.tasks?.events?.name ?? '',
      reg.shifts?.tasks?.name ?? '',
      reg.shifts ? `${format(new Date(reg.shifts.start_time), 'dd.MM.yyyy HH:mm')} - ${format(new Date(reg.shifts.end_time), 'HH:mm')}` : '',
      reg.status,
      reg.is_present ? 'Kyllä' : 'Ei',
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

        <div className="flex gap-4 mb-4">
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

        <div className="flex gap-4 mb-6">
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Kaikki tapahtumat</option>
            {uniqueEvents.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={taskFilter}
            onChange={e => setTaskFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Kaikki tehtävät</option>
            {uniqueTasks.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Kaikki päivät</option>
            {uniqueDates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Kaikki sijainnit</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <select
            value={isPresentFilter}
            onChange={e => setIsPresentFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Kaikki läsnä-tilat</option>
            <option value="present">Läsnä</option>
            <option value="not_present">Ei läsnä</option>
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
                    <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <span className="inline-flex items-center gap-1">Ilmoittautuja <SortIcon column="name" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('event')}>
                      <span className="inline-flex items-center gap-1">Tapahtuma / Tehtävä <SortIcon column="event" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('shift')}>
                      <span className="inline-flex items-center gap-1">Vuoro <SortIcon column="shift" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('location')}>
                      <span className="inline-flex items-center gap-1">Sijainti <SortIcon column="location" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pätevyydet</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <span className="inline-flex items-center gap-1">Tila <SortIcon column="status" /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('is_present')}>
                      <span className="inline-flex items-center gap-1 justify-center">Läsnä <SortIcon column="is_present" /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Poista</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                      <span className="inline-flex items-center gap-1">Ilmoittautui <SortIcon column="created_at" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((reg) => (
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
                      <td className="px-4 py-3 text-gray-700">
                        {reg.shifts?.location || '–'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {reg.has_pelinohjauskoulutus && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Pelinohjauskoulutus</span>
                          )}
                          {reg.has_ea1 && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">EA1</span>
                          )}
                          {reg.has_ajokortti && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti+ajolupa</span>
                          )}
                          {reg.has_jarjestyksenvalvontakortti && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Järjestyksenvalvonta</span>
                          )}
                          {!reg.has_pelinohjauskoulutus && !reg.has_ea1 && !reg.has_ajokortti && !reg.has_jarjestyksenvalvontakortti && (
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
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={reg.is_present ?? false}
                          onChange={() => handleTogglePresent(reg.id)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(reg.id, `${reg.first_name} ${reg.last_name}`)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline"
                        >
                          Poista
                        </button>
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
