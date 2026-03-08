import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// User pages
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import PrivacyPage from './pages/PrivacyPage'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEvents from './pages/admin/AdminEvents'
import AdminEventDetail from './pages/admin/AdminEventDetail'
import AdminTaskDetail from './pages/admin/AdminTaskDetail'
import AdminRegistrations from './pages/admin/AdminRegistrations'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Käyttäjäpuoli */}
      <Route path="/" element={<HomePage />} />
      <Route path="/event/:eventId" element={<EventPage />} />
      <Route path="/tietosuoja/:eventId" element={<PrivacyPage />} />
      <Route path="/tietosuoja" element={<PrivacyPage />} />

      {/* Admin-puoli */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute>
            <AdminEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:eventId"
        element={
          <ProtectedRoute>
            <AdminEventDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tasks/:taskId"
        element={
          <ProtectedRoute>
            <AdminTaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/registrations"
        element={
          <ProtectedRoute>
            <AdminRegistrations />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
