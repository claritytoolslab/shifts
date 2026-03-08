import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AIContext = 'categories_teams' | 'events'

interface CategoriesTeamsResult {
  type: 'categories_teams'
  categories: string[]
  teams: string[]
}

interface EventDraft {
  name: string
  description: string
  location: string
  start_date: string
  end_date: string
}

interface EventsResult {
  type: 'events'
  events: EventDraft[]
}

type AIResult = CategoriesTeamsResult | EventsResult

interface Props {
  context: AIContext
  onSaved?: () => void
}

const CONTEXT_LABELS: Record<AIContext, string> = {
  categories_teams: 'Kategoriat & Tiimit',
  events: 'Tapahtumat',
}

const CONTEXT_PLACEHOLDERS: Record<AIContext, string> = {
  categories_teams: 'esim. "Luo jalkapalloturnaukselle sopivat tehtäväkategoriat ja joukkueet"',
  events: 'esim. "Tikkurila Cup 2026 jalkapalloturnaus Vantaalla, heinäkuussa"',
}

export default function AdminAIAssistant({ context, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set())

  async function handleGenerate() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Virhe AI-kutsussa')

      const r = data.result as AIResult
      setResult(r)

      // Esivalitse kaikki
      if (r.type === 'categories_teams') {
        setSelectedCategories(new Set(r.categories))
        setSelectedTeams(new Set(r.teams))
      } else {
        setSelectedEvents(new Set(r.events.map((_, i) => i)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tuntematon virhe')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    try {
      if (result.type === 'categories_teams') {
        const cats = result.categories.filter((c) => selectedCategories.has(c))
        const teams = result.teams.filter((t) => selectedTeams.has(t))
        if (cats.length > 0) {
          await supabase.from('categories').upsert(cats.map((name) => ({ name })), { onConflict: 'name' })
        }
        if (teams.length > 0) {
          await supabase.from('teams').upsert(teams.map((name) => ({ name })), { onConflict: 'name' })
        }
      } else {
        const evs = result.events.filter((_, i) => selectedEvents.has(i))
        if (evs.length > 0) {
          await supabase.from('events').insert(
            evs.map((e) => ({
              name: e.name,
              description: e.description || null,
              location: e.location || null,
              start_date: e.start_date,
              end_date: e.end_date,
              is_active: false,
            }))
          )
        }
      }
      onSaved?.()
      setResult(null)
      setPrompt('')
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tallennus epäonnistui')
    } finally {
      setSaving(false)
    }
  }

  const nothingSelected =
    result?.type === 'categories_teams'
      ? selectedCategories.size === 0 && selectedTeams.size === 0
      : result?.type === 'events'
      ? selectedEvents.size === 0
      : true

  function toggleCategory(name: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleTeam(name: string) {
    setSelectedTeams((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleEvent(i: number) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <>
      {/* Kelluva nappi */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full shadow-lg transition-all text-sm font-medium"
      >
        <Sparkles size={16} />
        AI-assistentti
      </button>

      {/* Slideover-paneeli */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />

          {/* Paneeli */}
          <div className="relative z-10 w-full max-w-sm bg-white shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">AI-assistentti</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{CONTEXT_LABELS[context]}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Sisältö */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Prompt-kenttä */}
              <div>
                <label className="label">Kerro mitä haluat luoda</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
                  }}
                  rows={3}
                  className="input text-sm resize-none"
                  placeholder={CONTEXT_PLACEHOLDERS[context]}
                />
                <p className="text-xs text-gray-400 mt-1">Cmd+Enter generoi</p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Generoidaan...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Generoi
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
              )}

              {/* Tulokset */}
              {result && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ehdotukset — valitse tallennettavat</p>

                  {result.type === 'categories_teams' && (
                    <>
                      {result.categories.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Kategoriat</p>
                          <ul className="space-y-1">
                            {result.categories.map((cat) => (
                              <li key={cat}>
                                <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.has(cat)}
                                    onChange={() => toggleCategory(cat)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                  />
                                  {cat}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.teams.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Tiimit</p>
                          <ul className="space-y-1">
                            {result.teams.map((team) => (
                              <li key={team}>
                                <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedTeams.has(team)}
                                    onChange={() => toggleTeam(team)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                  />
                                  {team}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {result.type === 'events' && (
                    <ul className="space-y-2">
                      {result.events.map((ev, i) => (
                        <li key={i} className="border rounded-lg p-3">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedEvents.has(i)}
                              onChange={() => toggleEvent(i)}
                              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600"
                            />
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{ev.name}</p>
                              {ev.location && (
                                <p className="text-xs text-gray-500">{ev.location}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {ev.start_date} – {ev.end_date}
                              </p>
                              {ev.description && (
                                <p className="text-xs text-gray-600 mt-1">{ev.description}</p>
                              )}
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer — tallenna-nappi */}
            {result && (
              <div className="p-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving || nothingSelected}
                  className="btn-primary w-full"
                >
                  {saving ? 'Tallennetaan...' : 'Tallenna valitut'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
