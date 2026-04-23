import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// User pages
import HomePage from './pages/HomePage'
import EventPage from './pages/EventPage'
import PrivacyPage from './pages/PrivacyPage'
import FeedbackPage from './pages/FeedbackPage'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEvents from './pages/admin/AdminEvents'
import AdminEventDetail from './pages/admin/AdminEventDetail'
import AdminRegistrations from './pages/admin/AdminRegistrations'
import AdminCategoriesTeams from './pages/admin/AdminCategoriesTeams'
import AdminShiftSpreadsheet from './pages/admin/AdminShiftSpreadsheet'
import AdminEventReport from './pages/admin/AdminEventReport'

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
      <Route path="/palaute" element={<FeedbackPage />} />

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
        path="/admin/registrations"
        element={
          <ProtectedRoute>
            <AdminRegistrations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute>
            <AdminCategoriesTeams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:eventId/shifts"
        element={
          <ProtectedRoute>
            <AdminShiftSpreadsheet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:eventId/report"
        element={
          <ProtectedRoute>
            <AdminEventReport />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
