import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Badge, Modal, Spinner, EmptyState, ProgressBar } from '../components/UI'
import { formatDate } from '../utils/helpers'

const YEAR = new Date().getFullYear()

export default function Checkins() {
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkinModal, setCheckinModal] = useState(null) // sheet

  useEffect(() => {
    api.get(`/goals/sheets?cycle_year=${YEAR}`)
      .then(r => setSheets(r.data.filter(s => s.status === 'approved')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quarterly Check-ins</h1>
        <p className="text-gray-500">Conduct structured check-ins with team members</p>
      </div>

      {sheets.length === 0 ? (
        <EmptyState title="No approved goal sheets" description="Approve team goal sheets to start check-ins." />
      ) : (
        <div className="grid gap-4">
          {sheets.map(sheet => (
            <CheckinCard
              key={sheet.id}
              sheet={sheet}
              onCheckin={() => setCheckinModal(sheet)}
            />
          ))}
        </div>
      )}

      {checkinModal && (
        <CheckinModal
          sheet={checkinModal}
          onClose={() => setCheckinModal(null)}
          onSave={() => { setCheckinModal(null); toast.success('Check-in recorded!') }}
        />
      )}
    </div>
  )
}

function CheckinCard({ sheet, onCheckin }) {
  const [checkins, setCheckins] = useState([])
  const completedQ = new Set(checkins.map(c => c.quarter))

  useEffect(() => {
    api.get(`/goals/sheets/${sheet.id}/checkins`).then(r => setCheckins(r.data))
  }, [sheet.id])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{sheet.employee?.name}</h3>
          <p className="text-sm text-gray-500">{sheet.employee?.department?.name}</p>
        </div>
        <button className="btn-primary text-sm" onClick={onCheckin}>+ Add Check-in</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {['q1','q2','q3','q4'].map(q => (
          <div key={q} className={`rounded-lg p-3 text-center border-2 ${
            completedQ.has(q) ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-xs font-medium uppercase">{q}</p>
            <p className="text-lg">{completedQ.has(q) ? '✅' : '⏳'}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {sheet.goals?.slice(0, 3).map(goal => {
          const latestAch = goal.achievements?.[goal.achievements.length - 1]
          return (
            <div key={goal.id} className="flex items-center gap-3 text-sm">
              <span className="text-gray-600 flex-1 truncate">{goal.title}</span>
              <span className="text-gray-400 text-xs">{goal.weightage}%</span>
              {latestAch && <ProgressBar score={latestAch.progress_score} size="sm" />}
            </div>
          )
        })}
        {(sheet.goals?.length || 0) > 3 && (
          <p className="text-xs text-gray-400">+{sheet.goals.length - 3} more goals</p>
        )}
      </div>
    </div>
  )
}

function CheckinModal({ sheet, onClose, onSave }) {
  const [form, setForm] = useState({ quarter: 'q1', cycle_year: YEAR, comment: '' })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/goals/sheets/${sheet.id}/checkins`, form)
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error')
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`Check-in: ${sheet.employee?.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Goals Summary</h4>
          {sheet.goals?.map(goal => {
            const latest = goal.achievements?.[goal.achievements.length - 1]
            return (
              <div key={goal.id} className="flex justify-between items-center py-1 text-sm">
                <span className="text-gray-700 truncate flex-1">{goal.title}</span>
                <span className="text-gray-400 mx-2">{goal.weightage}%</span>
                {latest ? (
                  <Badge status={latest.status} />
                ) : (
                  <span className="text-xs text-gray-400">No data</span>
                )}
              </div>
            )
          })}
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
            <select className="input" value={form.quarter} onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))}>
              <option value="q1">Q1 (July)</option>
              <option value="q2">Q2 (October)</option>
              <option value="q3">Q3 (January)</option>
              <option value="q4">Q4 / Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Comment</label>
            <textarea className="input" rows={4} value={form.comment}
              onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
              placeholder="Document your discussion, feedback, and next steps..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Save Check-in'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
