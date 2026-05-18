import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Badge, Modal, Spinner, EmptyState } from '../components/UI'

export default function Users() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [thrustAreas, setThrustAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'user' | 'dept' | 'thrust'
  const [tab, setTab] = useState('users')

  const fetchAll = async () => {
    const [uRes, dRes, tRes] = await Promise.all([
      api.get('/users/'),
      api.get('/users/departments/all'),
      api.get('/users/thrust-areas/all'),
    ])
    setUsers(uRes.data)
    setDepartments(dRes.data)
    setThrustAreas(tRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return
    await api.delete(`/users/${id}`)
    toast.success('User deactivated')
    fetchAll()
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">{users.length} users · {departments.length} departments</p>
        </div>
        <div className="flex gap-2">
          {tab === 'users' && (
            <button className="btn-primary" onClick={() => setModal('user')}>+ Add User</button>
          )}
          {tab === 'departments' && (
            <button className="btn-primary" onClick={() => setModal('dept')}>+ Add Department</button>
          )}
          {tab === 'thrust' && (
            <button className="btn-primary" onClick={() => setModal('thrust')}>+ Add Thrust Area</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { k: 'users', label: '👤 Users' },
          { k: 'departments', label: '🏢 Departments' },
          { k: 'thrust', label: '🎯 Thrust Areas' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Email</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Role</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Department</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium">{u.name}</td>
                  <td className="py-3 px-3 text-gray-500">{u.email}</td>
                  <td className="py-3 px-3 capitalize">
                    <span className={`badge ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{u.department?.name || '—'}</td>
                  <td className="py-3 px-3">
                    <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {u.is_active && (
                      <button className="text-xs text-red-600 hover:underline" onClick={() => deactivate(u.id)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {departments.map(d => (
            <div key={d.id} className="card flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-gray-400">ID: {d.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'thrust' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {thrustAreas.map(t => (
            <div key={t.id} className="card">
              <p className="font-semibold text-brand-700">{t.name}</p>
              {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
            </div>
          ))}
        </div>
      )}

      {modal === 'user' && (
        <AddUserModal
          departments={departments}
          managers={users.filter(u => u.role === 'manager')}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchAll() }}
        />
      )}
      {modal === 'dept' && (
        <AddSimpleModal
          title="Add Department"
          fields={[{ name: 'name', label: 'Name', required: true }]}
          endpoint="/users/departments"
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchAll() }}
        />
      )}
      {modal === 'thrust' && (
        <AddSimpleModal
          title="Add Thrust Area"
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'description', label: 'Description' },
          ]}
          endpoint="/users/thrust-areas"
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchAll() }}
        />
      )}
    </div>
  )
}

function AddUserModal({ departments, managers, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'employee',
    department_id: '', manager_id: '',
  })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.department_id) payload.department_id = Number(payload.department_id)
      else delete payload.department_id
      if (payload.manager_id) payload.manager_id = Number(payload.manager_id)
      else delete payload.manager_id
      await api.post('/users/', payload)
      toast.success('User created!')
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error creating user')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Add New User" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input type="password" className="input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select className="input" value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}>
              <option value="">None</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        {form.role === 'employee' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
            <select className="input" value={form.manager_id} onChange={e => setForm(p => ({ ...p, manager_id: e.target.value }))}>
              <option value="">None</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function AddSimpleModal({ title, fields, endpoint, onClose, onSave }) {
  const [form, setForm] = useState(Object.fromEntries(fields.map(f => [f.name, ''])))
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(endpoint, form)
      toast.success('Created successfully!')
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    } finally { setSaving(false) }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {fields.map(f => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {f.label} {f.required && '*'}
            </label>
            <input
              className="input"
              value={form[f.name]}
              onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
              required={f.required}
            />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}
