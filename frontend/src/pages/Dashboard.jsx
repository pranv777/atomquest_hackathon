import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { StatCard, Spinner } from '../components/UI'
import { Badge, ProgressBar } from '../components/UI'
import { formatDate } from '../utils/helpers'
import { Link } from 'react-router-dom'

const YEAR = new Date().getFullYear()

export default function Dashboard() {
  const { user } = useAuth()
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/goals/sheets?cycle_year=${YEAR}`)
      .then(r => setSheets(r.data))
      .finally(() => setLoading(false))
  }, [])

  const mySheet = sheets.find(s => s.employee_id === user?.id)
  const teamSheets = sheets.filter(s => s.employee_id !== user?.id)

  const stats = {
    total: sheets.length,
    approved: sheets.filter(s => s.status === 'approved').length,
    submitted: sheets.filter(s => s.status === 'submitted').length,
    draft: sheets.filter(s => s.status === 'draft').length,
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Goal cycle {YEAR} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sheets" value={stats.total} color="brand" />
        <StatCard label="Approved" value={stats.approved} color="green" />
        <StatCard label="Pending Review" value={stats.submitted} color="yellow" />
        <StatCard label="In Draft" value={stats.draft} color="red" />
      </div>

      {/* My Goal Sheet */}
      {user?.role === 'employee' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">My Goal Sheet — {YEAR}</h2>
          {mySheet ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge status={mySheet.status} />
                <Link to="/my-goals" className="text-brand-600 text-sm hover:underline">View details →</Link>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Goals</p>
                  <p className="font-semibold">{mySheet.goals?.length || 0} / 8</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Weightage</p>
                  <p className="font-semibold">
                    {mySheet.goals?.reduce((s, g) => s + g.weightage, 0).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted</p>
                  <p className="font-semibold">{formatDate(mySheet.submitted_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Approved</p>
                  <p className="font-semibold">{formatDate(mySheet.approved_at)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No goal sheet for {YEAR} yet.</p>
              <Link to="/my-goals" className="btn-primary">Create Goal Sheet</Link>
            </div>
          )}
        </div>
      )}

      {/* Team overview for manager / admin */}
      {(user?.role === 'manager' || user?.role === 'admin') && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Team Goal Sheets — {YEAR}</h2>
            <Link to="/team" className="text-brand-600 text-sm hover:underline">View all →</Link>
          </div>
          {sheets.length === 0 ? (
            <p className="text-gray-500 text-sm">No goal sheets found for this cycle.</p>
          ) : (
            <div className="space-y-3">
              {sheets.slice(0, 5).map(sheet => (
                <div key={sheet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{sheet.employee?.name}</p>
                    <p className="text-xs text-gray-500">{sheet.goals?.length} goals · {sheet.employee?.department?.name}</p>
                  </div>
                  <Badge status={sheet.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Check-in calendar reminder */}
      <div className="card bg-gradient-to-r from-brand-50 to-blue-50 border-brand-200">
        <h3 className="font-semibold text-brand-900 mb-2">📅 Check-in Schedule</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { period: 'Q1', window: 'July', color: 'bg-blue-100 text-blue-800' },
            { period: 'Q2', window: 'October', color: 'bg-purple-100 text-purple-800' },
            { period: 'Q3', window: 'January', color: 'bg-orange-100 text-orange-800' },
            { period: 'Q4 / Annual', window: 'March–April', color: 'bg-green-100 text-green-800' },
          ].map(q => (
            <div key={q.period} className={`${q.color} rounded-lg p-3 text-center`}>
              <p className="font-bold">{q.period}</p>
              <p className="text-xs mt-0.5">{q.window}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
