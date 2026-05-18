import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { Spinner, EmptyState, ProgressBar, Badge } from '../components/UI'
import { UOM_LABELS, formatDate } from '../utils/helpers'

const YEAR = new Date().getFullYear()

export default function Achievements() {
  const { user } = useAuth()
  const [sheet, setSheet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/goals/sheets?cycle_year=${YEAR}`)
      .then(r => setSheet(r.data.find(s => s.employee_id === user.id) || null))
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  if (!sheet) return (
    <EmptyState
      title="No goal sheet found"
      description={`Create and get your goal sheet approved to track achievements for ${YEAR}.`}
    />
  )

  if (sheet.status !== 'approved') return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Achievements — {YEAR}</h1>
      <div className="card text-center py-12">
        <p className="text-4xl mb-3">⏳</p>
        <p className="text-lg font-semibold text-gray-700">Goal sheet not yet approved</p>
        <p className="text-gray-500 mt-1">
          Your sheet is currently <span className="font-medium capitalize">{sheet.status}</span>.
          Achievements can only be tracked after manager approval.
        </p>
      </div>
    </div>
  )

  const quarters = ['q1', 'q2', 'q3', 'q4']
  const quarterLabels = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4' }

  // Compute overall scores per quarter
  const quarterSummary = quarters.map(q => {
    const achs = sheet.goals.flatMap(g => g.achievements.filter(a => a.quarter === q))
    if (!achs.length) return { quarter: q, avgScore: null, completed: 0, total: 0 }
    const scored = achs.filter(a => a.progress_score != null)
    const avg = scored.length ? scored.reduce((s, a) => s + a.progress_score, 0) / scored.length : null
    return {
      quarter: q,
      avgScore: avg,
      completed: achs.filter(a => a.status === 'completed').length,
      total: achs.length,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Achievements — {YEAR}</h1>
        <p className="text-gray-500">{sheet.goals.length} goals · Approved {formatDate(sheet.approved_at)}</p>
      </div>

      {/* Quarter summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quarterSummary.map(q => (
          <div key={q.quarter} className="card text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{quarterLabels[q.quarter]}</p>
            {q.total === 0 ? (
              <p className="text-gray-400 text-sm">No data</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-brand-600">
                  {q.avgScore != null ? `${(q.avgScore * 100).toFixed(0)}%` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">{q.completed}/{q.total} completed</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Goal-wise breakdown */}
      <div className="space-y-4">
        {sheet.goals.map(goal => {
          const byQ = Object.fromEntries(goal.achievements.map(a => [a.quarter, a]))
          return (
            <div key={goal.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-brand-500">{goal.thrust_area?.name}</span>
                    <span className="text-xs text-gray-400">{UOM_LABELS[goal.uom_type]}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                  {goal.target_value != null && (
                    <p className="text-sm text-gray-500 mt-0.5">Target: <strong>{goal.target_value}</strong></p>
                  )}
                </div>
                <span className="text-brand-600 font-bold text-lg ml-4">{goal.weightage}%</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quarters.map(q => {
                  const a = byQ[q]
                  return (
                    <div key={q} className={`rounded-xl p-3 border-2 ${
                      a?.status === 'completed' ? 'bg-green-50 border-green-200' :
                      a?.status === 'on_track' ? 'bg-yellow-50 border-yellow-200' :
                      a ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-dashed border-gray-200'
                    }`}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{q}</p>
                      {a ? (
                        <div className="space-y-2">
                          <Badge status={a.status} />
                          {a.actual_value != null && (
                            <p className="text-sm font-bold text-gray-900">{a.actual_value}</p>
                          )}
                          {a.actual_date && (
                            <p className="text-xs text-gray-500">{formatDate(a.actual_date)}</p>
                          )}
                          <ProgressBar score={a.progress_score} size="sm" />
                          {a.notes && (
                            <p className="text-xs text-gray-400 italic truncate">{a.notes}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-2">Not logged</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
