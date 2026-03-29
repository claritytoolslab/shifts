import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ShiftAvailability, Task, RegistrationInsert } from '../lib/database.types'
import { X, CheckCircle, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'

interface Props {
  shift: ShiftAvailability
  task: Task
  onClose: () => void
  onSuccess: () => void
}

interface RegistrationForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  has_pelinohjauskoulutus: boolean
  has_ea1: boolean
  has_ajokortti: boolean
  has_jarjestyksenvalvontakortti: boolean
  notes: string
  is_under_13: boolean
  guardian_phone: string
  gdpr_accepted: boolean
  confirm_requirements: boolean
}

export default function RegistrationModal({ shift, task, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegistrationForm>({
    defaultValues: {
      has_pelinohjauskoulutus: false,
      has_ea1: false,
      has_ajokortti: false,
      has_jarjestyksenvalvontakortti: false,
      is_under_13: false,
      gdpr_accepted: false,
    }
  })

  const isUnder13 = watch('is_under_13')

  const hasRequirements =
    task.requires_pelinohjauskoulutus ||
    task.requires_ea1 ||
    task.requires_ajokortti ||
    task.requires_jarjestyksenvalvontakortti ||
    !!task.other_requirements

  async function onSubmit(data: RegistrationForm) {
    setSaving(true)
    setError('')

    // Tarkista pätevyydet
    if (task.requires_pelinohjauskoulutus && !data.has_pelinohjauskoulutus) {
      setError('Tämä tehtävä vaatii Pelinohjauskoulutus-todistuksen.')
      setSaving(false)
      return
    }
    if (task.requires_ea1 && !data.has_ea1) {
      setError('Tämä tehtävä vaatii EA1-ensiapukoulutuksen.')
      setSaving(false)
      return
    }
    if (task.requires_ajokortti && !data.has_ajokortti) {
      setError('Tämä tehtävä vaatii B-ajokortin ja ajoluvan.')
      setSaving(false)
      return
    }
    if (task.requires_jarjestyksenvalvontakortti && !data.has_jarjestyksenvalvontakortti) {
      setError('Tämä tehtävä vaatii järjestyksenvalvontakortin.')
      setSaving(false)
      return
    }

    const payload: RegistrationInsert = {
      shift_id: shift.shift_id,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      ssn: '',
      has_pelinohjauskoulutus: data.has_pelinohjauskoulutus,
      has_ea1: data.has_ea1,
      has_ajokortti: data.has_ajokortti,
      has_jarjestyksenvalvontakortti: data.has_jarjestyksenvalvontakortti,
      notes: data.notes?.trim() || null,
      status: 'confirmed',
      gdpr_accepted: data.gdpr_accepted,
      is_under_13: data.is_under_13,
      guardian_phone: data.is_under_13 ? data.guardian_phone?.trim() || null : null,
      cancellation_token: crypto.randomUUID(),
    }

    const { data: insertedReg, error: insertError } = await supabase
      .from('registrations')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !insertedReg) {
      const errorMsg = insertError?.message || 'Tuntematon virhe'
      setError(`Ilmoittautuminen epäonnistui: ${errorMsg}`)
      console.error(insertError)
    } else {
      setStep('success')
      // Lähetä vahvistussähköposti (fire-and-forget)
      fetch('/.netlify/functions/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: insertedReg.id }),
      }).catch(() => {})
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">

        {step === 'success' ? (
          /* Onnistumisnäkymä */
          <div className="p-8 text-center">
            <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ilmoittautuminen onnistui!</h3>
            <p className="text-gray-500 mb-2">Olet ilmoittautunut vuoroon:</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <div className="font-medium text-gray-900">{task.name}</div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <Clock size={13} />
                {format(new Date(shift.start_time), 'EEEE d.M.yyyy HH:mm', { locale: fi })}
                {' – '}
                {format(new Date(shift.end_time), 'HH:mm', { locale: fi })}
              </div>
              {shift.location && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                  <MapPin size={13} />
                  {shift.location}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Vahvistus lähetetään antamaasi sähköpostiosoitteeseen.
            </p>
            <button onClick={onSuccess} className="btn-primary w-full">
              Sulje
            </button>
          </div>
        ) : (
          /* Lomake */
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ilmoittaudu vuoroon</h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                  <Clock size={13} />
                  {format(new Date(shift.start_time), 'd.M.yyyy HH:mm', { locale: fi })}
                  {' – '}
                  {format(new Date(shift.end_time), 'HH:mm', { locale: fi })}
                  {' · '}
                  {task.name}
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Vaatimushälytys */}
              {hasRequirements && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
                    <AlertTriangle size={16} />
                    Tehtävä vaatii pätevyyksiä
                  </div>
                  <ul className="text-sm text-amber-600 space-y-1">
                    {task.requires_pelinohjauskoulutus && <li>• Pelinohjauskoulutus</li>}
                    {task.requires_ea1 && <li>• EA1 (Ensiapu)</li>}
                    {task.requires_ajokortti && <li>• B-ajokortti + ajolupa</li>}
                    {task.requires_jarjestyksenvalvontakortti && <li>• Järjestyksenvalvontakortti</li>}
                    {task.other_requirements && <li>• {task.other_requirements}</li>}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Etunimi *</label>
                  <input
                    {...register('first_name', { required: 'Etunimi on pakollinen' })}
                    className="input"
                    placeholder="Matti"
                  />
                  {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label className="label">Sukunimi *</label>
                  <input
                    {...register('last_name', { required: 'Sukunimi on pakollinen' })}
                    className="input"
                    placeholder="Meikäläinen"
                  />
                  {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Sähköposti *</label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Sähköposti on pakollinen',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Virheellinen sähköpostiosoite' }
                  })}
                  className="input"
                  placeholder="matti@esimerkki.fi"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="label">Puhelinnumero *</label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Puhelinnumero on pakollinen' })}
                  className="input"
                  placeholder="+358 40 123 4567"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>

              {/* Pätevyydet */}
              <div>
                <label className="label">Pätevyydet ja kortit (rasti mitä sinulla on)</label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('has_pelinohjauskoulutus')}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Pelinohjauskoulutus</span>
                    {task.requires_pelinohjauskoulutus && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded">Vaaditaan</span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('has_ea1')}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>EA1 (Ensiapu)</span>
                    {task.requires_ea1 && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded">Vaaditaan</span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('has_ajokortti')}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>B-ajokortti + ajolupa</span>
                    {task.requires_ajokortti && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">Vaaditaan</span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('has_jarjestyksenvalvontakortti')}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Järjestyksenvalvontakortti</span>
                    {task.requires_jarjestyksenvalvontakortti && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded">Vaaditaan</span>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Lisätietoja</label>
                <textarea
                  {...register('notes')}
                  className="input"
                  rows={2}
                  placeholder="Muuta huomioitavaa..."
                />
              </div>

              {/* Alle 13v */}
              <div className="border-t pt-4 space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('is_under_13')}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Olen alle 13-vuotias</span>
                </label>
                {isUnder13 && (
                  <div>
                    <label className="label">Huoltajan puhelinnumero *</label>
                    <input
                      type="tel"
                      {...register('guardian_phone', {
                        required: isUnder13 ? 'Huoltajan puhelinnumero on pakollinen alle 13-vuotiaille' : false
                      })}
                      className="input"
                      placeholder="+358 40 123 4567"
                    />
                    {errors.guardian_phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.guardian_phone.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* GDPR */}
              <div className="border-t pt-4">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('gdpr_accepted', {
                      required: 'Sinun täytyy hyväksyä tietosuojaseloste'
                    })}
                    className="w-4 h-4 rounded border-gray-300 mt-0.5"
                  />
                  <span className="text-gray-600">
                    Olen lukenut ja hyväksyn{' '}
                    <Link to={`/tietosuoja/${task.event_id}`} target="_blank" className="text-blue-600 hover:underline">
                      tietosuojaselosteen
                    </Link>
                    . Tietojani käytetään vuorovarauksen hallintaan.
                  </span>
                </label>
                {errors.gdpr_accepted && (
                  <p className="text-red-500 text-sm mt-1">{errors.gdpr_accepted.message}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('confirm_requirements', {
                      required: 'Sinun täytyy vahvistaa tiedot'
                    })}
                    className="w-4 h-4 rounded border-gray-300 mt-0.5"
                  />
                  <span className="text-gray-600">
                    Vahvistan, että antamani tiedot ovat oikeat ja minulla on tehtävässä vaaditut pätevyydet.
                  </span>
                </label>
                {errors.confirm_requirements && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirm_requirements.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Ilmoittaudutaan...
                    </span>
                  ) : (
                    'Ilmoittaudu vuoroon'
                  )}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Peruuta
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
