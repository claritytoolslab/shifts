import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'
import type { Category, Team } from '../../lib/database.types'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

function ItemList<T extends { id: string; name: string }>({
  title,
  items,
  onAdd,
  onRename,
  onDelete,
}: {
  title: string
  items: T[]
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAdding(true)
    await onAdd(trimmed)
    setNewName('')
    setAdding(false)
  }

  async function handleRename(id: string) {
    const trimmed = editingName.trim()
    if (!trimmed) return
    await onRename(id, trimmed)
    setEditingId(null)
  }

  function startEdit(item: T) {
    setEditingId(item.id)
    setEditingName(item.name)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">Ei vielä kohteita.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2">
              {editingId === item.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(item.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="input flex-1 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleRename(item.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          className="input flex-1 text-sm"
          placeholder="Uuden nimi..."
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="btn-primary flex items-center gap-1 text-sm px-3"
        >
          <Plus size={15} />
          Lisää
        </button>
      </div>
    </div>
  )
}

export default function AdminCategoriesTeams() {
  const [categories, setCategories] = useState<Category[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [catRes, teamRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
    ])
    if (catRes.data) setCategories(catRes.data as Category[])
    if (teamRes.data) setTeams(teamRes.data as Team[])
    setLoading(false)
  }

  async function addCategory(name: string) {
    const { error } = await supabase.from('categories').insert({ name })
    if (error) setError(error.message)
    else fetchAll()
  }

  async function renameCategory(id: string, name: string) {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id)
    if (error) setError(error.message)
    else fetchAll()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Poista kategoria?')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchAll()
  }

  async function addTeam(name: string) {
    const { error } = await supabase.from('teams').insert({ name })
    if (error) setError(error.message)
    else fetchAll()
  }

  async function renameTeam(id: string, name: string) {
    const { error } = await supabase.from('teams').update({ name }).eq('id', id)
    if (error) setError(error.message)
    else fetchAll()
  }

  async function deleteTeam(id: string) {
    if (!confirm('Poista tiimi?')) return
    await supabase.from('teams').delete().eq('id', id)
    fetchAll()
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Kategoriat & Tiimit</h2>
          <p className="text-sm text-gray-500 mt-1">Globaalit listat tehtävien luokitteluun</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <ItemList
            title="Kategoriat"
            items={categories}
            onAdd={addCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
          />
          <ItemList
            title="Tiimit"
            items={teams}
            onAdd={addTeam}
            onRename={renameTeam}
            onDelete={deleteTeam}
          />
        </div>
      </div>
    </AdminLayout>
  )
}
