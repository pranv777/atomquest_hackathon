import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Spinner } from '../components/UI'
import { formatDate } from '../utils/helpers'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/reports/audit-logs?limit=200')
      .then(r => setLogs(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l =>
    !search ||
    l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  )

  const ACTION_COLORS = {
    CREATE_USER: 'bg-blue-100 text-blue-700',
    UPDATE_USER: 'bg-yellow-100 text-yellow-700',
    SUBMIT_SHEET: 'bg-purple-100 text-purple-700',
    APPROVE_SHEET: 'bg-green-100 text-green-700',
    RETURN_SHEET: 'bg-red-100 text-red-700',
    EDIT_LOCKED_GOAL: 'bg-orange-100 text-orange-700',
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-500">{logs.length} entries — all post-lock changes logged</p>
        </div>
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
          placeholder="Search by user, action, entity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-3 font-medium text-gray-600 whitespace-nowrap">Timestamp</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">User</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Action</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Entity</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Description</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Changes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No audit logs found</td></tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(log.created_at)}</td>
                  <td className="py-3 px-3 font-medium">{log.user?.name || `#${log.user_id}`}</td>
                  <td className="py-3 px-3">
                    <span className={`badge text-xs ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs">
                    {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                  </td>
                  <td className="py-3 px-3 text-gray-600 max-w-xs truncate">{log.description || '—'}</td>
                  <td className="py-3 px-3">
                    {log.old_values && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-brand-600 hover:underline">View diff</summary>
                        <div className="mt-1 space-y-1">
                          {Object.keys(log.old_values).map(k => (
                            <div key={k} className="text-xs">
                              <span className="text-gray-500">{k}: </span>
                              <span className="text-red-500 line-through mr-1">{String(log.old_values[k])}</span>
                              <span className="text-green-600">{String(log.new_values?.[k] ?? '')}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
