import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { Lock, Mail } from 'lucide-react'

interface LoginForm {
  email: string
  password: string
}

export default function AdminLogin() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  if (user) {
    return <Navigate to="/admin" replace />
  }

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setError('Virheellinen sähköposti tai salasana.')
    } else {
      navigate('/admin')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vuorovaraus</h1>
          <p className="text-gray-500 mt-2">Kirjaudu hallintapaneeliin</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Sähköposti</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  {...register('email', { required: 'Sähköposti on pakollinen' })}
                  className="input pl-9"
                  placeholder="admin@esimerkki.fi"
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Salasana</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  {...register('password', { required: 'Salasana on pakollinen' })}
                  className="input pl-9"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Kirjaudu sisään'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
