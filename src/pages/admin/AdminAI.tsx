import AdminLayout from '../../components/AdminLayout'
import AdminAIAssistant from '../../components/AdminAIAssistant'

export default function AdminAI() {
  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">AI-assistentti</h2>
          <p className="text-sm text-gray-500 mt-1">Hallinnoi tapahtumia, kategorioita ja joukkueita tekoälyn avulla</p>
        </div>
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <AdminAIAssistant context="categories_teams" inline />
        </div>
      </div>
    </AdminLayout>
  )
}
