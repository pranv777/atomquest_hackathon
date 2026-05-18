import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Spinner, Badge } from '../components/UI'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const YEAR = new Date().getFullYear()

export default function Reports() {
  const [tab, setTab] = useState('completion')
  const [completionData, setCompletionData] = useState([])
  const [achievementData, setAchievementData] = useState([])
  const [auditData, setAuditData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [compRes, achRes, auditRes] = await Promise.all([
        api.get(`/reports/completion-dashboard?cycle_year=${YEAR}`),
        api.get(`/reports/achievement?cycle_year=${YEAR}`),
        api.get('/reports/audit-logs?limit=50').catch(() => ({ data: [] })),
      ])
      setCompletionData(compRes.data)
      setAchievementData(achRes.data)
      setAuditData(auditRes.data)
    } catch (e) { toast.error('Error loading reports') }
    finally { setLoading(false) }
  }

  const exportCSV = () => window.open(`/api/reports/export/csv?cycle_year=${YEAR}`, '_blank')
  const exportExcel = () => window.open(`/api/reports/export/excel?cycle_year=${YEAR}`, '_blank')

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Governance</h1>
          <p className="text-gray-500">Cycle Year {YEAR}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportCSV}>📥 Export CSV</button>
          <button className="btn-secondary" onClick={exportExcel}>📊 Export Excel</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { k: 'completion', label: '✅ Completion Dashboard' },
          { k: 'achievement', label: '📊 Achievement Report' },
          { k: 'audit', label: '🔍 Audit Trail' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'completion' && (
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Check-in Completion Dashboard</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Employee</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Sheet Status</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Q1</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Q2</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Q3</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Q4</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {completionData.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{row.employee_name}</td>
                  <td className="py-3 px-2"><Badge status={row.sheet_status} /></td>
                  {['q1','q2','q3','q4'].map(q => (
                    <td key={q} className="py-3 px-2 text-center">
                      {row.checkins[q] ? '✅' : '⏸'}
                    </td>
                  ))}
                  <td className="py-3 px-2 text-gray-500">{formatDate(row.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {completionData.length === 0 && <p className="text-center text-gray-400 py-8">No data available</p>}
        </div>
      )}

      {tab === 'achievement' && (
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Achievement Report</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Employee</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Goal</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Thrust Area</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Qtr</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Target</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Actual</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Score</th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {achievementData.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{row.employee_name}</td>
                  <td className="py-3 px-2 max-w-xs truncate">{row.goal_title}</td>
                  <td className="py-3 px-2 text-gray-500">{row.thrust_area}</td>
                  <td className="py-3 px-2 text-center uppercase text-xs font-medium">{row.quarter}</td>
                  <td className="py-3 px-2 text-right">{row.target ?? '—'}</td>
                  <td className="py-3 px-2 text-right">{row.actual ?? '—'}</td>
                  <td className="py-3 px-2 text-right font-semibold">
                    {row.progress_score != null ? `${row.progress_score}%` : '—'}
                  </td>
                  <td className="py-3 px-2 text-center"><Badge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {achievementData.length === 0 && <p className="text-center text-gray-400 py-8">No achievement data yet</p>}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Timestamp</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">User</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Action</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Entity</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody>
              {auditData.map((log, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="py-3 px-2 font-medium">{log.user?.name}</td>
                  <td className="py-3 px-2">
                    <span className="badge bg-blue-100 text-blue-700">{log.action}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{log.entity_type} #{log.entity_id}</td>
                  <td className="py-3 px-2 text-gray-600">{log.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditData.length === 0 && <p className="text-center text-gray-400 py-8">No audit logs</p>}
        </div>
      )}
    </div>
  )
}
