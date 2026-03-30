import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event, EmailQueue } from '../../lib/database.types'
import { ArrowLeft, TableProperties, FileText, Settings, Mail, AlertTriangle, RefreshCw, X, Send } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fi } from 'date-fns/locale'

export default function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [shiftCount, setShiftCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Email settings modal
  const [showEmailSettings, setShowEmailSettings] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailBodyText, setEmailBodyText] = useState('')
  const [emailMode, setEmailMode] = useState<'text' | 'html'>('text')
  const [senderName, setSenderName] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Email queue
  const [showEmailQueue, setShowEmailQueue] = useState(false)
  const [emailQueue, setEmailQueue] = useState<EmailQueue[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, shiftsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase
        .from('shifts')
        .select('id, tasks!inner(event_id)', { count: 'exact', head: true })
        .eq('tasks.event_id', eventId!),
    ])
    const ev = eventRes.data as Event | null
    if (ev) setEvent(ev)
    setShiftCount(shiftsRes.count ?? 0)

    // Hae epäonnistuneiden sähköpostien määrä
    if (ev) {
      const { count } = await supabase
        .from('email_queue')
        .select('id, registrations!inner(shift_id, shifts!inner(task_id, tasks!inner(event_id)))', { count: 'exact', head: true })
        .eq('status', 'failed')
        .eq('registrations.shifts.tasks.event_id', eventId!)
      setFailedCount(count ?? 0)
    }

    setLoading(false)
  }

  function textToHtml(text: string): string {
    if (!text.trim()) return ''

    const lines = text.split('\n')
    let html = ''
    let inList = false
    let listItems: string[] = []

    lines.forEach((line) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('-')) {
        // Lista-rivi
        if (!inList) {
          inList = true
          listItems = []
        }
        const item = trimmed.slice(1).trim()
        listItems.push(`  <li>${item}</li>`)
      } else if (trimmed === '') {
        // Tyhjä rivi - lopeta lista jos käynnissä
        if (inList) {
          html += `<ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">\n${listItems.join('\n')}\n</ul>\n\n`
          inList = false
          listItems = []
        }
      } else {
        // Tavallinen rivi
        if (inList) {
          html += `<ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">\n${listItems.join('\n')}\n</ul>\n\n`
          inList = false
          listItems = []
        }
        html += `<p style="margin: 0 0 12px 0; color: #555; line-height: 1.6;">${trimmed}</p>\n`
      }
    })

    // Lopeta lista jos vielä käynnissä
    if (inList && listItems.length > 0) {
      html += `<ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">\n${listItems.join('\n')}\n</ul>`
    }

    return html.trim()
  }

  function htmlToText(html: string): string {
    // Yksinkertainen konversio HTML:stä tekstiin
    let text = html
      .replace(/<ul[^>]*>/g, '')
      .replace(/<\/ul>/g, '')
      .replace(/<li[^>]*>/g, '- ')
      .replace(/<\/li>/g, '')
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/<h3[^>]*>/g, '')
      .replace(/<\/h3>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
    return text.trim()
  }

  function openEmailSettings() {
    if (event) {
      setEmailSubject(event.confirmation_email_subject ?? '')
      setEmailBody(event.confirmation_email_body ?? '')
      setSenderName(event.sender_name ?? '')
      // Konvertoi HTML tekstiksi näyttöä varten
      setEmailBodyText(htmlToText(event.confirmation_email_body ?? ''))
      setEmailMode('text')
    }
    setShowEmailSettings(true)
  }

  function handleEmailTextChange(text: string) {
    setEmailBodyText(text)
    setEmailBody(textToHtml(text))
  }

  function handleEmailHtmlChange(html: string) {
    setEmailBody(html)
    setEmailBodyText(htmlToText(html))
  }

  async function saveEmailSettings() {
    setSavingEmail(true)
    const { error } = await supabase
      .from('events')
      .update({
        confirmation_email_subject: emailSubject || null,
        confirmation_email_body: emailBody || null,
        sender_name: senderName || null,
      })
      .eq('id', eventId!)

    if (!error && event) {
      setEvent({
        ...event,
        confirmation_email_subject: emailSubject || null,
        confirmation_email_body: emailBody || null,
        sender_name: senderName || null,
      })
    }
    setSavingEmail(false)
    setShowEmailSettings(false)
  }

  async function openEmailQueue() {
    setShowEmailQueue(true)
    setLoadingQueue(true)

    // Hae kaikki tämän tapahtuman sähköpostit
    const { data } = await supabase
      .from('email_queue')
      .select('*, registrations!inner(shift_id, first_name, last_name, shifts!inner(task_id, tasks!inner(event_id)))')
      .eq('registrations.shifts.tasks.event_id', eventId!)
      .order('created_at', { ascending: false })

    setEmailQueue((data as unknown as EmailQueue[]) ?? [])
    setLoadingQueue(false)
  }

  async function retryEmail(queueItem: EmailQueue) {
    setRetryingId(queueItem.id)
    try {
      const res = await fetch('/.netlify/functions/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: queueItem.registration_id }),
      })
      const result = await res.json()

      if (result.success) {
        // Päivitä vanha queue entry
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
          .eq('id', queueItem.id)
      }
    } catch {
      // ignore
    }
    setRetryingId(null)
    openEmailQueue() // Päivitä lista
  }

  async function retryAllFailed() {
    const failed = emailQueue.filter(q => q.status === 'failed')
    for (const item of failed) {
      await retryEmail(item)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Otsikko */}
        <div className="flex items-center gap-2 mb-6">
          <Link to="/admin/events" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{event?.name}</h2>
            {event && (
              <p className="text-sm text-gray-500">
                {format(parseISO(event.start_date), 'd.M.yyyy', { locale: fi })}
                {' – '}
                {format(parseISO(event.end_date), 'd.M.yyyy', { locale: fi })}
                {event.location && ` · ${event.location}`}
              </p>
            )}
          </div>
        </div>

        {/* Toimintokortit */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Vuorojen hallinta */}
          <Link
            to={`/admin/events/${eventId}/shifts`}
            className="card hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                <TableProperties size={22} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Hallitse vuoroja</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Taulukkonäkymä – lisää, muokkaa ja poista vuoroja. Luo tehtäviä ja joukkueita suoraan.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {shiftCount} vuoroa
                </p>
              </div>
            </div>
          </Link>

          {/* Tuntiraportti */}
          <Link
            to={`/admin/events/${eventId}/report`}
            className="card hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                <FileText size={22} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Tuntiraportti</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Joukkueiden työtunnit, läsnäolot ja poissaolot. Lataa CSV-raportti.
                </p>
              </div>
            </div>
          </Link>

          {/* Sähköpostiasetukset */}
          <button
            onClick={openEmailSettings}
            className="card hover:border-green-300 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                <Mail size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Sähköpostiasetukset</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Muokkaa vahvistussähköpostin sisältöä. Lisää linkkejä ja viestejä.
                </p>
                {event?.confirmation_email_body && (
                  <p className="text-xs text-green-600 mt-2">Mukautettu viesti käytössä</p>
                )}
              </div>
            </div>
          </button>

          {/* Sähköpostijono */}
          <button
            onClick={openEmailQueue}
            className="card hover:border-orange-300 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                <Send size={22} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Sähköpostijono</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Lähetetyt ja epäonnistuneet sähköpostit. Yritä uudelleen epäonnistuneita.
                </p>
                {failedCount > 0 && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {failedCount} epäonnistunutta lähetystä
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Kategoriat & tehtävät */}
          <Link
            to="/admin/categories"
            className="card hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                <Settings size={22} className="text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Kategoriat, tiimit & tehtävät</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Hallitse tehtävien vaatimuksia, kategorioita ja joukkueita.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Sähköpostiasetukset-modaali */}
      {showEmailSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Sähköpostiasetukset</h3>
              <button onClick={() => setShowEmailSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Lähettäjän nimi</label>
                <input
                  className="input"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Varauslista"
                />
                <p className="text-xs text-gray-400 mt-1">Tyhjä = "Varauslista"</p>
              </div>
              <div>
                <label className="label">Sähköpostin otsikko</label>
                <input
                  className="input"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder={`Ilmoittautumisesi on vahvistettu – ${event?.name ?? ''}`}
                />
                <p className="text-xs text-gray-400 mt-1">Tyhjä = oletus-otsikko</p>
              </div>
              <div>
                <label className="label">Mukautettu viesti</label>
                <div className="flex gap-2 mb-2 border-b border-gray-200">
                  <button
                    onClick={() => setEmailMode('text')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      emailMode === 'text'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Normaali teksti
                  </button>
                  <button
                    onClick={() => setEmailMode('html')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      emailMode === 'html'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    HTML (advanced)
                  </button>
                </div>

                {emailMode === 'text' ? (
                  <>
                    <textarea
                      className="input text-sm"
                      rows={10}
                      value={emailBodyText}
                      onChange={e => handleEmailTextChange(e.target.value)}
                      placeholder={`Muistilista:
- Saavu 15 min ennen vuoron alkua
- Ota mukaan vedenpullo ja energiabaari
- Käytä mukavaa ja liikuntakelpoista vaatetta

Kysymyksiä? Ota yhteyttä järjestäjiin.`}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Kirjoita normaalia tekstiä. Rivit jotka alkavat "-" tulevat listaksi. Tyhjä rivi erottaa kappaleet.
                    </p>
                  </>
                ) : (
                  <>
                    <textarea
                      className="input font-mono text-sm"
                      rows={10}
                      value={emailBody}
                      onChange={e => handleEmailHtmlChange(e.target.value)}
                      placeholder={`<p>Muistilista:</p>
<ul style="margin: 0; padding-left: 20px;">
  <li>Saavu 15 min ennen</li>
  <li>Ota mukaan vesi</li>
</ul>`}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Käytettävissä: <code className="bg-gray-100 px-1 rounded">&lt;p&gt;</code> (kappale),
                      <code className="bg-gray-100 px-1 rounded ml-1">&lt;ul&gt;&lt;li&gt;</code> (lista),
                      <code className="bg-gray-100 px-1 rounded ml-1">&lt;a href=""&gt;</code> (linkki),
                      <code className="bg-gray-100 px-1 rounded ml-1">style=""</code> (värit/marginaalit)
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEmailSettings}
                  disabled={savingEmail}
                  className="btn-primary flex-1"
                >
                  {savingEmail ? 'Tallennetaan...' : 'Tallenna'}
                </button>
                <button
                  onClick={() => setShowEmailSettings(false)}
                  className="btn-secondary"
                >
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sähköpostijono-modaali */}
      {showEmailQueue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Sähköpostijono</h3>
              <div className="flex items-center gap-2">
                {emailQueue.some(q => q.status === 'failed') && (
                  <button
                    onClick={retryAllFailed}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    Lähetä kaikki epäonnistuneet uudelleen
                  </button>
                )}
                <button onClick={() => setShowEmailQueue(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingQueue ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : emailQueue.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Ei sähköposteja vielä.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Vastaanottaja</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Otsikko</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Tila</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Aika</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailQueue.map(q => (
                        <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{q.to_email}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{q.subject}</td>
                          <td className="px-4 py-3">
                            {q.status === 'sent' ? (
                              <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                Lähetetty
                              </span>
                            ) : q.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium" title={q.error_message ?? ''}>
                                <AlertTriangle size={12} />
                                Epäonnistui
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                Jonossa
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {format(new Date(q.created_at), 'd.M.yyyy HH:mm', { locale: fi })}
                          </td>
                          <td className="px-4 py-3">
                            {q.status === 'failed' && (
                              <button
                                onClick={() => retryEmail(q)}
                                disabled={retryingId === q.id}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                              >
                                {retryingId === q.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                ) : (
                                  <RefreshCw size={12} />
                                )}
                                Yritä uudelleen
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
