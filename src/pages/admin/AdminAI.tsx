import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import AdminAIAssistant from '../../components/AdminAIAssistant'

type AIContext = 'categories_teams' | 'events' | 'tasks' | 'shifts'

const TABS: { value: AIContext; label: string }[] = [
  { value: 'categories_teams', label: 'Kategoriat & Tiimit' },
  { value: 'events', label: 'Tapahtumat' },
  { value: 'tasks', label: 'Tehtävät' },
  { value: 'shifts', label: 'Vuorot' },
]

export default function AdminAI() {
  const [context, setContext] = useState<AIContext>('categories_teams')

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">AI-assistentti</h2>
          <p className="text-sm text-gray-500 mt-1">Hallinnoi tapahtumia, kategorioita ja joukkueita tekoälyn avulla</p>
        </div>

        {/* Välilehdet */}
        <div className="flex gap-1 mb-3">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setContext(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                context === tab.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <AdminAIAssistant key={context} context={context} inline />
        </div>
      </div>
    </AdminLayout>
  )
}
