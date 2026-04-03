import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event } from '../../lib/database.types'
import { Plus, Pencil, Trash2, Eye, EyeOff, X, ListChecks } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

interface EventFormState {
  name: string
  description: string
  start_date: string
  end_date: string
  location: string
  is_active: boolean
  privacy_contact: string
  privacy_retention: string
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const emptyForm = (): EventFormState => ({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    is_active: true,
    privacy_contact: '',
    privacy_retention: '12 kuukautta',
  })

  const [form, setForm] = useState<EventFormState>(emptyForm())

  function setField<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFormErrors(prev => ({ ...prev, [key]: '' }))
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })

    if (!error && data) setEvents(data as Event[])
    setLoading(false)
  }

  function openCreateForm() {
    setEditingEvent(null)
    setForm(emptyForm())
    setFormErrors({})
    setError('')
    setShowForm(true)
  }

  function openEditForm(event: Event) {
    setEditingEvent(event)
    setForm({
      name: event.name,
      description: event.description ?? '',
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location ?? '',
      is_active: event.is_active,
      privacy_contact: event.privacy_contact ?? '',
      privacy_retention: event.privacy_retention ?? '12 kuukautta',
    })
    setFormErrors({})
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nimi on pakollinen'
    if (!form.start_date) errs.start_date = 'Alkupäivä on pakollinen'
    if (!form.end_date) errs.end_date = 'Loppupäivä on pakollinen'
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errs.end_date = 'Loppupäivän pitää olla alkupäivän jälkeen'
    }
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date,
      location: form.location || null,
      is_active: form.is_active,
      privacy_contact: form.privacy_contact || null,
      privacy_retention: form.privacy_retention || null,
    }

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingEvent.id)
      if (error) {
        setError('Tallennus epäonnistui: ' + error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('events').insert(payload)
      if (error) {
        setError('Luonti epäonnistui: ' + error.message)
        setSaving(false)
        return
      }
    }

    setShowForm(false)
    fetchEvents()
    setSaving(false)
  }

  async function toggleActive(event: Event) {
    await supabase
      .from('events')
      .update({ is_active: !event.is_active, updated_at: new Date().toISOString() })
      .eq('id', event.id)
    fetchEvents()
  }

  async function deleteEvent(id: string) {
    if (!confirm('Haluatko varmasti poistaa tämän tapahtuman? Kaikki tehtävät ja vuorot poistetaan myös.')) return
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Tapahtumat</h2>
          <button onClick={openCreateForm} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Uusi tapahtuma
          </button>
        </div>

        {/* Lomake */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">
                  {editingEvent ? 'Muokkaa tapahtumaa' : 'Uusi tapahtuma'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Tapahtuman nimi *</label>
                  <input
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    className="input"
                    placeholder="esim. Kesätapahtuma 2025"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="label">Kuvaus</label>
                  <textarea
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Lyhyt kuvaus tapahtumasta"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Alkupäivä *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setField('start_date', e.target.value)}
                      className="input"
                    />
                    {formErrors.start_date && <p className="text-red-500 text-sm mt-1">{formErrors.start_date}</p>}
                  </div>
                  <div>
                    <label className="label">Loppupäivä *</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setField('end_date', e.target.value)}
                      className="input"
                    />
                    {formErrors.end_date && <p className="text-red-500 text-sm mt-1">{formErrors.end_date}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Sijainti</label>
                  <input
                    value={form.location}
                    onChange={e => setField('location', e.target.value)}
                    className="input"
                    placeholder="esim. Helsinki, Kaisaniemen puisto"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={e => setField('is_active', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Aktiivinen (näkyy käyttäjille)
                  </label>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tietosuoja</p>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Järjestäjän yhteystiedot</label>
                      <textarea
                        value={form.privacy_contact}
                        onChange={e => setField('privacy_contact', e.target.value)}
                        className="input"
                        rows={3}
                        placeholder={"Organisaatio ry\nKatu 1, 00100 Helsinki\ninfo@org.fi"}
                      />
                      <p className="text-xs text-gray-400 mt-1">Näkyy tapahtuman tietosuojaselosteessa</p>
                    </div>
                    <div>
                      <label className="label">Tietojen säilytysaika</label>
                      <input
                        value={form.privacy_retention}
                        onChange={e => setField('privacy_retention', e.target.value)}
                        className="input"
                        placeholder="esim. 12 kuukautta"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Tallennetaan...' : editingEvent ? 'Tallenna muutokset' : 'Luo tapahtuma'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Peruuta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Ei tapahtumia. Luo ensimmäinen tapahtuma!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {event.is_active ? 'Aktiivinen' : 'Piilotettu'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-gray-500 text-sm mb-2">{event.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>
                        {format(new Date(event.start_date), 'd.M.yyyy', { locale: fi })} –{' '}
                        {format(new Date(event.end_date), 'd.M.yyyy', { locale: fi })}
                      </span>
                      {event.location && <span>{event.location}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/admin/events/${event.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Hallitse tehtäviä"
                    >
                      <ListChecks size={16} />
                    </Link>
                    <button
                      onClick={() => toggleActive(event)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title={event.is_active ? 'Piilota' : 'Aktivoi'}
                    >
                      {event.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => openEditForm(event)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Muokkaa"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Poista"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
