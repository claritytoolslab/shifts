import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Users, LogOut, LayoutDashboard, Menu, X, Tags, Sparkles } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const navItems = [
    { path: '/admin', label: 'Yhteenveto', icon: LayoutDashboard },
    { path: '/admin/events', label: 'Tapahtumat', icon: Calendar },
    { path: '/admin/registrations', label: 'Ilmoittautumiset', icon: Users },
    { path: '/admin/categories', label: 'Kategoriat & Tiimit', icon: Tags },
    { path: '/admin/ai', label: 'AI-assistentti', icon: Sparkles },
  ]

  const SidebarContent = () => (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
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
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobiili yläpalkki */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Avaa valikko"
        >
          <Menu size={22} />
        </button>
        <span className="font-bold text-gray-900">Vuorovaraus</span>
      </header>

      {/* Mobiili sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Tausta-overlay */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside className="relative z-50 w-64 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Vuorovaraus</h1>
                <p className="text-xs text-gray-500">Hallintapaneeli</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop layout */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed top-0 bottom-0">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Vuorovaraus</h1>
            <p className="text-sm text-gray-500 mt-1">Hallintapaneeli</p>
          </div>
          <SidebarContent />
        </aside>
        {/* Desktop main content with sidebar offset */}
        <main className="flex-1 ml-64 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobiili main content */}
      <main className="lg:hidden pt-14">
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  )
}
