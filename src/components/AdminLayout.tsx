import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Users, LogOut, LayoutDashboard } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const navItems = [
    { path: '/admin', label: 'Yhteenveto', icon: LayoutDashboard },
    { path: '/admin/events', label: 'Tapahtumat', icon: Calendar },
    { path: '/admin/registrations', label: 'Ilmoittautumiset', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sivupalkki */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Vuorovaraus</h1>
          <p className="text-sm text-gray-500 mt-1">Hallintapaneeli</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === path
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-3 truncate">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Kirjaudu ulos
          </button>
        </div>
      </aside>

      {/* Pääsisältö */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
