import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import { Calendar, Users, ListChecks, Clock } from 'lucide-react'

interface Stats {
  eventCount: number
  taskCount: number
  shiftCount: number
  registrationCount: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    eventCount: 0,
    taskCount: 0,
    shiftCount: 0,
    registrationCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [events, tasks, shifts, regs] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('shifts').select('id', { count: 'exact', head: true }),
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      ])

      setStats({
        eventCount: events.count ?? 0,
        taskCount: tasks.count ?? 0,
        shiftCount: shifts.count ?? 0,
        registrationCount: regs.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: 'Tapahtumat', value: stats.eventCount, icon: Calendar, color: 'blue', link: '/admin/events' },
    { label: 'Tehtävät', value: stats.taskCount, icon: ListChecks, color: 'purple', link: '/admin/events' },
    { label: 'Vuorot', value: stats.shiftCount, icon: Clock, color: 'green', link: '/admin/events' },
    { label: 'Ilmoittautumiset', value: stats.registrationCount, icon: Users, color: 'orange', link: '/admin/registrations' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
  }

  return (
    <AdminLayout>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Yhteenveto</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map(({ label, value, icon: Icon, color, link }) => (
              <Link key={label} to={link}>
                <div className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">{label}</span>
                    <div className={`p-2 rounded-lg ${colorMap[color]}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{value}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pikalinkit</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/events" className="btn-primary">
              Hallitse tapahtumia
            </Link>
            <Link to="/admin/registrations" className="btn-secondary">
              Näytä ilmoittautumiset
            </Link>
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Avaa käyttäjänäkymä
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
