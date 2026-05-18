import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Badge, Modal, Spinner, EmptyState, ProgressBar } from '../components/UI'
import { UOM_LABELS, formatDate } from '../utils/helpers'

const YEAR = new Date().getFullYear()
const QUARTERS = ['q1', 'q2', 'q3', 'q4']

export default function MyGoals() {
  const { user } = useAuth()
  const [sheet, setSheet] = useState(null)
  const [thrustAreas, setThrustAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showAchModal, setShowAchModal] = useState(null) // goal object
  const [editGoal, setEditGoal] = useState(null)
  const [activeTab, setActiveTab] = useState('goals')

  const fetchSheet = async () => {
    const [sheetsRes, taRes] = await Promise.all([
      api.get(`/goals/sheets?cycle_year=${YEAR}`),
      api.get('/users/thrust-areas/all'),
    ])
    const mine = sheetsRes.data.find(s => s.employee_id === user.id)
    setSheet(mine || null)
    setThrustAreas(taRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchSheet() }, [])

  const createSheet = async () => {
    try {
      await api.post('/goals/sheets', { cycle_year: YEAR })
      toast.success('Goal sheet created!')
      fetchSheet()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const submitSheet = async () => {
    if (!window.confirm('Submit your goal sheet for manager review?')) return
    try {
      await api.post(`/goals/sheets/${sheet.id}/submit`)
      toast.success('Goal sheet submitted!')
      fetchSheet()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const totalWeight = sheet?.goals?.reduce((s, g) => s + g.weightage, 0) || 0
  const canEdit = sheet && ['draft', 'returned'].includes(sheet.status)
  const canSubmit = canEdit && sheet.goals?.length > 0

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Goals</h1>
          <p className="text-gray-500">Cycle Year: {YEAR}</p>
        </div>
        {!sheet && (
          <button className="btn-primary" onClick={createSheet}>+ Create Goal Sheet</button>
        )}
      </div>

      {!sheet ? (
        <EmptyState
          title="No goal sheet yet"
          description="Create your goal sheet for this cycle to get started."
        />
      ) : (
        <>
          {/* Sheet status bar */}
          <div className="card flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Badge status={sheet.status} />
              <span className="text-sm text-gray-500">
                {sheet.goals?.length || 0}/8 goals · {totalWeight.toFixed(0)}% weightage
                {Math.abs(totalWeight - 100) > 0.01 && sheet.goals?.length > 0 && (
                  <span className="ml-2 text-red-500 font-medium">
                    {totalWeight < 100 ? `(${(100 - totalWeight).toFixed(0)}% remaining)` : `(${(totalWeight - 100).toFixed(0)}% over)`}
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-2">
              {canEdit && sheet.goals?.length < 8 && (
                <button className="btn-secondary" onClick={() => { setEditGoal(null); setShowGoalModal(true) }}>
                  + Add Goal
                </button>
              )}
              {canSubmit && Math.abs(totalWeight - 100) < 0.01 && (
                <button className="btn-primary" onClick={submitSheet}>Submit for Approval</button>
              )}
            </div>
          </div>

          {sheet.manager_comment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800">Manager comment:</p>
              <p className="text-sm text-yellow-700 mt-1">{sheet.manager_comment}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {['goals', 'achievements'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}>
                {t === 'goals' ? '🎯 Goals' : '📊 Achievements'}
              </button>
            ))}
          </div>

          {activeTab === 'goals' && (
            <div className="space-y-4">
              {sheet.goals?.length === 0 ? (
                <EmptyState title="No goals added" description="Add goals to your sheet." />
              ) : (
                sheet.goals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    canEdit={canEdit && !goal.is_read_only}
                    onEdit={() => { setEditGoal(goal); setShowGoalModal(true) }}
                    onDelete={() => deleteGoal(goal.id)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-4">
              {sheet.status !== 'approved' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                  Achievements can only be logged after your goal sheet is approved.
                </div>
              )}
              {sheet.goals?.map(goal => (
                <AchievementCard
                  key={goal.id}
                  goal={goal}
                  approved={sheet.status === 'approved'}
                  onLog={() => setShowAchModal(goal)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showGoalModal && (
        <GoalModal
          goal={editGoal}
          thrustAreas={thrustAreas}
          sheetId={sheet?.id}
          onClose={() => setShowGoalModal(false)}
          onSave={() => { setShowGoalModal(false); fetchSheet() }}
        />
      )}

      {showAchModal && (
        <AchievementModal
          goal={showAchModal}
          onClose={() => setShowAchModal(null)}
          onSave={() => { setShowAchModal(null); fetchSheet() }}
        />
      )}
    </div>
  )

  async function deleteGoal(goalId) {
    if (!window.confirm('Delete this goal?')) return
    try {
      await api.delete(`/goals/goals/${goalId}`)
      toast.success('Goal deleted')
      fetchSheet()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }
}

function GoalCard({ goal, canEdit, onEdit, onDelete }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-brand-600">{goal.thrust_area?.name}</span>
            {goal.is_shared && <span className="badge bg-purple-100 text-purple-700">Shared</span>}
          </div>
          <h3 className="font-semibold text-gray-900">{goal.title}</h3>
          {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
          <div className="flex gap-4 mt-3 text-sm text-gray-600">
            <span>UoM: <strong>{UOM_LABELS[goal.uom_type]}</strong></span>
            {goal.target_value != null && <span>Target: <strong>{goal.target_value}</strong></span>}
            {goal.target_date && <span>Deadline: <strong>{formatDate(goal.target_date)}</strong></span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-brand-600">{goal.weightage}%</div>
          <div className="text-xs text-gray-400 mb-2">weightage</div>
          {canEdit && (
            <div className="flex gap-2 justify-end">
              <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">Edit</button>
              <button onClick={onDelete} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AchievementCard({ goal, approved, onLog }) {
  const byQ = Object.fromEntries(goal.achievements?.map(a => [a.quarter, a]) || [])
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{goal.title}</h3>
        {approved && (
          <button className="btn-secondary text-sm py-1" onClick={onLog}>Log Achievement</button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['q1', 'q2', 'q3', 'q4'].map(q => {
          const ach = byQ[q]
          return (
            <div key={q} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">{q}</p>
              {ach ? (
                <>
                  <Badge status={ach.status} />
                  {ach.actual_value != null && <p className="text-sm mt-1 font-medium">{ach.actual_value}</p>}
                  <ProgressBar score={ach.progress_score} size="sm" />
                </>
              ) : (
                <p className="text-xs text-gray-400">Not logged</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GoalModal({ goal, thrustAreas, sheetId, onClose, onSave }) {
  const [form, setForm] = useState({
    thrust_area_id: goal?.thrust_area_id || '',
    title: goal?.title || '',
    description: goal?.description || '',
    uom_type: goal?.uom_type || 'numeric_min',
    target_value: goal?.target_value ?? '',
    target_date: goal?.target_date ? goal.target_date.split('T')[0] : '',
    weightage: goal?.weightage || 10,
  })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, thrust_area_id: Number(form.thrust_area_id), weightage: Number(form.weightage) }
      if (!payload.target_value) delete payload.target_value
      if (!payload.target_date) delete payload.target_date
      if (goal) {
        await api.put(`/goals/goals/${goal.id}`, payload)
      } else {
        await api.post(`/goals/sheets/${sheetId}/goals`, payload)
      }
      toast.success(goal ? 'Goal updated!' : 'Goal added!')
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error saving goal')
    } finally { setSaving(false) }
  }

  return (
    <Modal title={goal ? 'Edit Goal' : 'Add Goal'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area *</label>
          <select className="input" value={form.thrust_area_id} onChange={e => setForm(p => ({ ...p, thrust_area_id: e.target.value }))} required>
            <option value="">Select...</option>
            {thrustAreas.map(ta => <option key={ta.id} value={ta.id}>{ta.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
          <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement *</label>
            <select className="input" value={form.uom_type} onChange={e => setForm(p => ({ ...p, uom_type: e.target.value }))}>
              {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%) *</label>
            <input type="number" className="input" min={10} max={100} step={1} value={form.weightage}
              onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {form.uom_type !== 'zero' && form.uom_type !== 'timeline' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
              <input type="number" className="input" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} />
            </div>
          )}
          {form.uom_type === 'timeline' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
              <input type="date" className="input" value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} />
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Goal'}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function AchievementModal({ goal, onClose, onSave }) {
  const [form, setForm] = useState({
    quarter: 'q1',
    cycle_year: YEAR,
    actual_value: '',
    actual_date: '',
    status: 'on_track',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, cycle_year: Number(form.cycle_year) }
      if (!payload.actual_value) delete payload.actual_value
      if (!payload.actual_date) delete payload.actual_date
      await api.post(`/goals/goals/${goal.id}/achievements`, payload)
      toast.success('Achievement logged!')
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`Log Achievement — ${goal.title}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
            <select className="input" value={form.quarter} onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))}>
              <option value="q1">Q1</option>
              <option value="q2">Q2</option>
              <option value="q3">Q3</option>
              <option value="q4">Q4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="not_started">Not Started</option>
              <option value="on_track">On Track</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        {goal.uom_type !== 'zero' && (
          <div className="grid grid-cols-2 gap-4">
            {goal.uom_type !== 'timeline' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Value</label>
                <input type="number" className="input" value={form.actual_value} onChange={e => setForm(p => ({ ...p, actual_value: e.target.value }))} />
              </div>
            )}
            {goal.uom_type === 'timeline' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                <input type="date" className="input" value={form.actual_date} onChange={e => setForm(p => ({ ...p, actual_date: e.target.value }))} />
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Log Achievement'}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}
