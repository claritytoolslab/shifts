import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Event, Task, Category } from '../../lib/database.types'
import { Plus, ChevronRight, ArrowLeft } from 'lucide-react'

export default function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId])

  async function fetchData() {
    const [eventRes, tasksRes, catRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId!).single(),
      supabase.from('tasks').select('*').eq('event_id', eventId!).order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    if (eventRes.data) setEvent(eventRes.data as Event)
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (catRes.data) setCategories(catRes.data as Category[])
    setLoading(false)
  }

  // Ryhmittele tehtävät kategoriaan
  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {}
    // Kaikki kategoriat ensin (myös tyhjät)
    categories.forEach(cat => { map[cat.name] = [] })
    tasks.forEach(task => {
      const key = task.category || 'Muut'
      if (!map[key]) map[key] = []
      map[key].push(task)
    })
    return map
  }, [tasks, categories])

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
        <div className="flex items-center gap-2 mb-6">
          <Link to="/admin/events" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{event?.name}</h2>
            <p className="text-sm text-gray-500">Tehtävien hallinta</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Tehtävät ({tasks.length})</h3>
          <Link
            to={`/admin/categories`}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Lisää tehtävä
          </Link>
        </div>

        <p className="text-xs text-gray-400 mb-4 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
          Tehtäviä hallitaan <Link to="/admin/categories" className="underline font-medium">Kategoriat, Tiimit &amp; Tehtävät</Link> -sivulta. Täältä voit klikata tehtävää ja hallita sen vuoroja.
        </p>

        {Object.keys(grouped).length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Ei tehtäviä. <Link to="/admin/categories" className="text-blue-600 underline">Luo tehtäviä täältä.</Link></p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, catTasks]) => (
              <div key={cat} className="card p-0 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="font-semibold text-gray-900">{cat}</span>
                  <span className="ml-2 text-xs text-gray-400">{catTasks.length} tehtävää</span>
                </div>
                {catTasks.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">Ei tehtäviä tässä kategoriassa</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {catTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{task.name}</p>
                          {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.min_age && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{task.min_age}v+</span>}
                            {task.requires_drivers_license && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B-kortti</span>}
                            {task.requires_tieturva && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Tieturva</span>}
                            {task.requires_hygiene_passport && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hygieniapassi</span>}
                          </div>
                        </div>
                        <Link
                          to={`/admin/tasks/${task.id}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium ml-3 shrink-0"
                        >
                          Valitse
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
