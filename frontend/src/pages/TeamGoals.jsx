import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Badge, Modal, Spinner, EmptyState, ProgressBar } from '../components/UI'
import { UOM_LABELS, formatDate, QUARTER_LABELS } from '../utils/helpers'

const YEAR = new Date().getFullYear()

export default function TeamGoals() {
  const { user } = useAuth()
  const [sheets, setSheets] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null) // { type: 'approve'|'return', sheet }
  const [shareModal, setShareModal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchSheets = async () => {
    const res = await api.get(`/goals/sheets?cycle_year=${YEAR}`)
    setSheets(res.data)
    setLoading(false)
  }

  useEffect(() => { fetchSheets() }, [])

  const filtered = filterStatus === 'all' ? sheets : sheets.filter(s => s.status === filterStatus)

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user.role === 'admin' ? 'All Goal Sheets' : 'Team Goals'}
          </h1>
          <p className="text-gray-500">Cycle {YEAR}</p>
        </div>
        <div className="flex gap-2">
          {['all', 'submitted', 'approved', 'draft', 'returned'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filterStatus === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No goal sheets found" description="No sheets match the selected filter." />
      ) : (
        <div className="grid gap-4">
          {filtered.map(sheet => (
            <div key={sheet.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(sheet)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold">
                    {sheet.employee?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{sheet.employee?.name}</p>
                    <p className="text-sm text-gray-500">
                      {sheet.employee?.department?.name} · {sheet.goals?.length} goals ·
                      {sheet.goals?.reduce((s, g) => s + g.weightage, 0).toFixed(0)}% total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={sheet.status} />
                  {sheet.status === 'submitted' && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button className="btn-primary text-sm py-1"
                        onClick={() => setActionModal({ type: 'approve', sheet })}>
                        Approve
                      </button>
                      <button className="btn-danger text-sm py-1"
                        onClick={() => setActionModal({ type: 'return', sheet })}>
                        Return
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet detail modal */}
      {selected && (
        <SheetDetailModal
          sheet={selected}
          onClose={() => setSelected(null)}
          onApprove={() => { setSelected(null); setActionModal({ type: 'approve', sheet: selected }) }}
          onReturn={() => { setSelected(null); setActionModal({ type: 'return', sheet: selected }) }}
          onShare={(goal) => setShareModal(goal)}
          onRefresh={fetchSheets}
        />
      )}

      {/* Approve / Return modal */}
      {actionModal && (
        <ApprovalModal
          type={actionModal.type}
          sheet={actionModal.sheet}
          onClose={() => setActionModal(null)}
          onDone={() => { setActionModal(null); fetchSheets() }}
        />
      )}

      {/* Share goal modal */}
      {shareModal && (
        <ShareGoalModal
          goal={shareModal}
          onClose={() => setShareModal(null)}
          onDone={() => { setShareModal(null); fetchSheets() }}
        />
      )}
    </div>
  )
}

function SheetDetailModal({ sheet, onClose, onApprove, onReturn, onShare, onRefresh }) {
  const [checkins, setCheckins] = useState([])
  const [tab, setTab] = useState('goals')

  useEffect(() => {
    api.get(`/goals/sheets/${sheet.id}/checkins`).then(r => setCheckins(r.data))
  }, [sheet.id])

  return (
    <Modal title={`${sheet.employee?.name}'s Goal Sheet — ${sheet.cycle_year}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge status={sheet.status} />
          <span className="text-sm text-gray-500">Submitted: {formatDate(sheet.submitted_at)}</span>
          <span className="text-sm text-gray-500">Approved: {formatDate(sheet.approved_at)}</span>
        </div>

        {sheet.manager_comment && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
            <strong>Comment:</strong> {sheet.manager_comment}
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit text-sm">
          {['goals', 'checkins'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow' : 'text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'goals' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sheet.goals?.map(goal => (
              <div key={goal.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{goal.title}</p>
                  <span className="text-brand-600 font-semibold">{goal.weightage}%</span>
                </div>
                <p className="text-xs text-gray-500">{goal.thrust_area?.name} · {UOM_LABELS[goal.uom_type]}</p>
                {goal.achievements?.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {['q1','q2','q3','q4'].map(q => {
                      const a = goal.achievements?.find(a => a.quarter === q)
                      return (
                        <div key={q} className="text-center">
                          <p className="text-xs text-gray-400">{q.toUpperCase()}</p>
                          {a ? <ProgressBar score={a.progress_score} size="sm" /> : <p className="text-xs text-gray-300">—</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <button className="text-xs text-purple-600 hover:underline mt-1" onClick={() => onShare(goal)}>
                  Share this goal →
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'checkins' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {checkins.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No check-ins yet.</p>
            ) : (
              checkins.map(c => (
                <div key={c.id} className="border rounded-lg p-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium uppercase">{c.quarter}</span>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm">{c.comment || '(No comment)'}</p>
                </div>
              ))
            )}
          </div>
        )}

        {sheet.status === 'submitted' && (
          <div className="flex gap-3 pt-2 border-t">
            <button className="btn-primary flex-1" onClick={onApprove}>Approve</button>
            <button className="btn-danger" onClick={onReturn}>Return</button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ApprovalModal({ type, sheet, onClose, onDone }) {
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      if (type === 'approve') {
        await api.post(`/goals/sheets/${sheet.id}/approve`, { comment })
        toast.success('Goal sheet approved!')
      } else {
        if (!comment.trim()) { toast.error('Please provide a comment for returning'); setSaving(false); return }
        await api.post(`/goals/sheets/${sheet.id}/return`, { comment })
        toast.success('Goal sheet returned for rework')
      }
      onDone()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={type === 'approve' ? '✅ Approve Goal Sheet' : '↩ Return for Rework'} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {type === 'approve'
            ? `You are approving ${sheet.employee?.name}'s goal sheet. Goals will be locked after approval.`
            : `You are returning ${sheet.employee?.name}'s goal sheet for revision.`}
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comment {type === 'return' && <span className="text-red-500">*</span>}
          </label>
          <textarea className="input" rows={3} value={comment} onChange={e => setComment(e.target.value)}
            placeholder={type === 'approve' ? 'Optional approval note...' : 'Reason for returning (required)...'} />
        </div>
        <div className="flex gap-3">
          <button className={type === 'approve' ? 'btn-primary flex-1' : 'btn-danger flex-1'} onClick={submit} disabled={saving}>
            {saving ? 'Processing...' : type === 'approve' ? 'Confirm Approval' : 'Return Sheet'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function ShareGoalModal({ goal, onClose, onDone }) {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data.filter(u => u.role === 'employee')))
  }, [])

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const share = async () => {
    if (selected.length === 0) { toast.error('Select at least one employee'); return }
    setSaving(true)
    try {
      await api.post('/goals/share', { goal_id: goal.id, employee_ids: selected })
      toast.success(`Goal shared with ${selected.length} employees!`)
      onDone()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Share Goal: ${goal.title}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Select employees to share this goal with. They can adjust weightage only.</p>
        <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
          {users.map(u => (
            <label key={u.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="rounded" />
              <span className="text-sm font-medium">{u.name}</span>
              <span className="text-xs text-gray-400">{u.department?.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={share} disabled={saving || selected.length === 0}>
            {saving ? 'Sharing...' : `Share with ${selected.length} selected`}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}
