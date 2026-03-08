import { useState, useRef, useEffect } from 'react'
import { X, Sparkles, Loader2, Send, RotateCcw } from 'lucide-react'
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

interface Message {
  role: 'user' | 'assistant'
  text?: string
  result?: AIResult
  error?: string
  saving?: boolean
  saved?: boolean
  selectedCategories?: Set<string>
  selectedTeams?: Set<string>
  selectedEvents?: Set<number>
}

interface Props {
  context: AIContext
  onSaved?: () => void
  inline?: boolean
}

const CONTEXT_LABELS: Record<AIContext, string> = {
  categories_teams: 'Kategoriat & Tiimit',
  events: 'Tapahtumat',
}

const CONTEXT_PLACEHOLDERS: Record<AIContext, string> = {
  categories_teams: 'esim. "Luo jalkapalloturnaukselle kategoriat ja joukkueet"',
  events: 'esim. "Tikkurila Cup 2026, jalkapallo, Vantaa, heinäkuu"',
}

const STORAGE_KEY = 'ai-assistant-messages'

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return parsed.map((m: Message) => ({
      ...m,
      selectedCategories: m.selectedCategories ? new Set(m.selectedCategories as unknown as string[]) : undefined,
      selectedTeams: m.selectedTeams ? new Set(m.selectedTeams as unknown as string[]) : undefined,
      selectedEvents: m.selectedEvents ? new Set(m.selectedEvents as unknown as number[]) : undefined,
    }))
  } catch { return [] }
}

function saveMessages(msgs: Message[]) {
  try {
    const serializable = msgs.map(m => ({
      ...m,
      selectedCategories: m.selectedCategories ? Array.from(m.selectedCategories) : undefined,
      selectedTeams: m.selectedTeams ? Array.from(m.selectedTeams) : undefined,
      selectedEvents: m.selectedEvents ? Array.from(m.selectedEvents) : undefined,
    }))
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch { /* ignore */ }
}

export default function AdminAIAssistant({ context, onSaved, inline = false }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    saveMessages(messages)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Virhe AI-kutsussa')

      const r = data.result as AIResult
      const assistantMsg: Message = {
        role: 'assistant',
        result: r,
        selectedCategories: r.type === 'categories_teams' ? new Set(r.categories) : undefined,
        selectedTeams: r.type === 'categories_teams' ? new Set(r.teams) : undefined,
        selectedEvents: r.type === 'events' ? new Set(r.events.map((_, i) => i)) : undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        error: e instanceof Error ? e.message : 'Tuntematon virhe',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function toggleCategory(msgIndex: number, name: string) {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIndex || !m.selectedCategories) return m
      const next = new Set(m.selectedCategories)
      next.has(name) ? next.delete(name) : next.add(name)
      return { ...m, selectedCategories: next }
    }))
  }

  function toggleTeam(msgIndex: number, name: string) {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIndex || !m.selectedTeams) return m
      const next = new Set(m.selectedTeams)
      next.has(name) ? next.delete(name) : next.add(name)
      return { ...m, selectedTeams: next }
    }))
  }

  function toggleEvent(msgIndex: number, idx: number) {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIndex || !m.selectedEvents) return m
      const next = new Set(m.selectedEvents)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return { ...m, selectedEvents: next }
    }))
  }

  async function handleSave(msgIndex: number) {
    const msg = messages[msgIndex]
    if (!msg.result) return

    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, saving: true } : m))

    try {
      if (msg.result.type === 'categories_teams') {
        const cats = msg.result.categories.filter(c => msg.selectedCategories?.has(c))
        const teams = msg.result.teams.filter(t => msg.selectedTeams?.has(t))
        if (cats.length > 0)
          await supabase.from('categories').upsert(cats.map(name => ({ name })), { onConflict: 'name' })
        if (teams.length > 0)
          await supabase.from('teams').upsert(teams.map(name => ({ name })), { onConflict: 'name' })
      } else {
        const evs = msg.result.events.filter((_, i) => msg.selectedEvents?.has(i))
        if (evs.length > 0)
          await supabase.from('events').insert(evs.map(e => ({
            name: e.name,
            description: e.description || null,
            location: e.location || null,
            start_date: e.start_date,
            end_date: e.end_date,
            is_active: false,
          })))
      }
      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, saving: false, saved: true } : m))
      onSaved?.()
    } catch (e) {
      setMessages(prev => prev.map((m, i) => i === msgIndex ? {
        ...m,
        saving: false,
        error: e instanceof Error ? e.message : 'Tallennus epäonnistui',
      } : m))
    }
  }

  function nothingSelected(msg: Message) {
    if (msg.result?.type === 'categories_teams')
      return (msg.selectedCategories?.size ?? 0) === 0 && (msg.selectedTeams?.size ?? 0) === 0
    if (msg.result?.type === 'events')
      return (msg.selectedEvents?.size ?? 0) === 0
    return true
  }

  const chatContent = (
    <div className={inline ? 'flex flex-col h-full' : 'relative z-10 w-full max-w-sm bg-white shadow-2xl flex flex-col h-full'}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <div>
                  <span className="font-semibold text-gray-900 text-sm">AI-assistentti</span>
                  <span className="text-xs text-gray-400 ml-2">{CONTEXT_LABELS[context]}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => { setMessages([]); sessionStorage.removeItem(STORAGE_KEY) }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                    title="Tyhjennä chat"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                {!inline && (
                  <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Viestit */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3 pb-8">
                  <Sparkles size={32} className="text-indigo-200" />
                  <p className="text-sm">Kerro mitä haluat luoda ja minä ehdotan sisältöä.</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-indigo-600 text-white text-sm px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="max-w-[95%] space-y-2">
                      {msg.error && (
                        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-2xl rounded-tl-sm text-sm">
                          {msg.error}
                        </div>
                      )}

                      {msg.result && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm p-3 space-y-3">
                          {msg.result.type === 'categories_teams' && (
                            <>
                              {msg.result.categories.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Kategoriat</p>
                                  <div className="space-y-1">
                                    {msg.result.categories.map(cat => (
                                      <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                                        <input
                                          type="checkbox"
                                          checked={msg.selectedCategories?.has(cat) ?? false}
                                          onChange={() => toggleCategory(i, cat)}
                                          disabled={msg.saved}
                                          className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                        />
                                        {cat}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {msg.result.teams.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tiimit</p>
                                  <div className="space-y-1">
                                    {msg.result.teams.map(team => (
                                      <label key={team} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                                        <input
                                          type="checkbox"
                                          checked={msg.selectedTeams?.has(team) ?? false}
                                          onChange={() => toggleTeam(i, team)}
                                          disabled={msg.saved}
                                          className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                        />
                                        {team}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {msg.result.type === 'events' && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tapahtumat</p>
                              {msg.result.events.map((ev, idx) => (
                                <label key={idx} className="flex items-start gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={msg.selectedEvents?.has(idx) ?? false}
                                    onChange={() => toggleEvent(i, idx)}
                                    disabled={msg.saved}
                                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600"
                                  />
                                  <div>
                                    <p className="font-semibold text-sm text-gray-900">{ev.name}</p>
                                    {ev.location && <p className="text-xs text-gray-500">{ev.location}</p>}
                                    <p className="text-xs text-gray-400">{ev.start_date} – {ev.end_date}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}

                          {msg.saved ? (
                            <p className="text-xs text-green-600 font-medium">Tallennettu!</p>
                          ) : (
                            <button
                              onClick={() => handleSave(i)}
                              disabled={msg.saving || nothingSelected(msg)}
                              className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                            >
                              {msg.saving ? 'Tallennetaan...' : 'Tallenna valitut'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span className="text-sm text-gray-500">Generoidaan...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-white p-3">
              <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={CONTEXT_PLACEHOLDERS[context]}
                  rows={1}
                  className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-gray-400 py-0.5 max-h-[120px]"
                  style={{ height: '24px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-1.5">Enter lähettää · Shift+Enter rivi</p>
            </div>
    </div>
  )

  if (inline) return chatContent

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full shadow-lg transition-all text-sm font-medium"
      >
        <Sparkles size={16} />
        AI-assistentti
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          {chatContent}
        </div>
      )}
    </>
  )
}
