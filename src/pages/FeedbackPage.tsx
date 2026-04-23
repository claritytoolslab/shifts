import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertCircle, Send } from 'lucide-react'

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string

type FeedbackType = 'Yleinen palaute' | 'Bugi / ongelma' | 'Ominaisuuspyyntö' | 'Kysymys'

export default function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('Yleinen palaute')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const errs: Record<string, string> = {}
    if (!subject.trim()) errs.subject = 'Aihe on pakollinen'
    if (!message.trim()) errs.message = 'Viesti on pakollinen'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Tarkista sähköpostiosoite'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStatus('sending')

    const body = new FormData()
    body.append('feedback_type', feedbackType)
    body.append('feedback_subject', subject.trim())
    body.append('feedback_message', message.trim())
    if (email.trim()) body.append('contact_email', email.trim())

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Kiitos palautteestasi!</h2>
          <p className="text-gray-600 mb-6">Viestisi on lähetetty onnistuneesti. Pyrimme vastaamaan mahdollisimman pian.</p>
          <Link to="/" className="btn-primary inline-block">Takaisin etusivulle</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft size={16} />
            Takaisin
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Anna palautetta</h1>
          <p className="text-gray-500 mt-1">Kehitysehdotukset ja bugi-ilmoitukset ovat tervetulleita.</p>
        </div>

        {status === 'error' && (
          <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm">Lähetys epäonnistui. Tarkista internet-yhteys ja yritä uudelleen.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5" noValidate>
          {/* Palautetyyppi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Palautetyyppi
            </label>
            <select
              name="feedback_type"
              value={feedbackType}
              onChange={e => setFeedbackType(e.target.value as FeedbackType)}
              className="input"
            >
              <option value="Yleinen palaute">Yleinen palaute</option>
              <option value="Bugi / ongelma">Bugi / ongelma</option>
              <option value="Ominaisuuspyyntö">Ominaisuuspyyntö</option>
              <option value="Kysymys">Kysymys</option>
            </select>
          </div>

          {/* Aihe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Aihe <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="feedback_subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={`input ${errors.subject ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Lyhyt kuvaus aiheesta"
            />
            {errors.subject && (
              <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
            )}
          </div>

          {/* Viesti */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Viesti <span className="text-red-500">*</span>
            </label>
            <textarea
              name="feedback_message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className={`input resize-none ${errors.message ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Kuvaile palaute tai ongelma mahdollisimman tarkasti..."
            />
            {errors.message && (
              <p className="text-xs text-red-500 mt-1">{errors.message}</p>
            )}
          </div>

          {/* Sähköposti */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sähköposti <span className="text-gray-400 font-normal">(vapaaehtoinen)</span>
            </label>
            <input
              type="email"
              name="contact_email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="sinun@email.fi"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Jätä tyhjäksi jos et halua vastausta.</p>
          </div>

          <button
            type="submit"
            disabled={status === 'sending'}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {status === 'sending' ? 'Lähetetään...' : 'Lähetä palaute'}
          </button>
        </form>
      </main>
    </div>
  )
}
