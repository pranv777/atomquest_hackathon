import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Spinner } from '../components/UI'
import toast from 'react-hot-toast'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter
} from 'recharts'

const YEAR = new Date().getFullYear()
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Analytics() {
  const [tab, setTab] = useState('qoq')
  const [loading, setLoading] = useState(false)
  const [qoq, setQoq] = useState([])
  const [heatmap, setHeatmap] = useState([])
  const [heatmapGroup, setHeatmapGroup] = useState('department')
  const [distribution, setDistribution] = useState(null)
  const [managerEff, setManagerEff] = useState([])
  const [year, setYear] = useState(YEAR)

  useEffect(() => { fetchAll() }, [year, heatmapGroup])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [qoqRes, heatRes, distRes, mgrRes] = await Promise.all([
        api.get(`/analytics/qoq-trends?cycle_year=${year}`),
        api.get(`/analytics/heatmap?cycle_year=${year}&group_by=${heatmapGroup}`),
        api.get(`/analytics/goal-distribution?cycle_year=${year}`),
        api.get(`/analytics/manager-effectiveness?cycle_year=${year}`).catch(() => ({ data: [] })),
      ])
      setQoq(qoqRes.data)
      setHeatmap(heatRes.data)
      setDistribution(distRes.data)
      setManagerEff(mgrRes.data)
    } catch (e) {
      toast.error('Error loading analytics')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { k: 'qoq', label: '📈 QoQ Trends' },
    { k: 'heatmap', label: '🗺 Completion Heatmap' },
    { k: 'distribution', label: '🍩 Goal Distribution' },
    { k: 'manager', label: '👔 Manager Effectiveness' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Goal achievement insights and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Cycle Year:</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[YEAR - 1, YEAR, YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {tab === 'qoq' && <QoQSection data={qoq} />}
          {tab === 'heatmap' && (
            <HeatmapSection
              data={heatmap}
              groupBy={heatmapGroup}
              onGroupChange={setHeatmapGroup}
            />
          )}
          {tab === 'distribution' && distribution && <DistributionSection data={distribution} />}
          {tab === 'manager' && <ManagerSection data={managerEff} />}
        </>
      )}
    </div>
  )
}

/* ── QoQ Trends ──────────────────────────────────────────────────────────── */
function QoQSection({ data }) {
  if (!data.length) return <EmptyChart />
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {data.map(d => (
          <div key={d.quarter} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase">{d.quarter}</p>
            <p className="text-3xl font-bold text-brand-600 mt-1">{d.avg_score}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {d.completed}/{d.total} completed
            </p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Average Achievement Score by Quarter</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => [`${v}%`, 'Avg Score']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <Line
              type="monotone" dataKey="avg_score" name="Avg Score (%)"
              stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1' }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart for completion count */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Completed vs Total Goals</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Legend />
            <Bar dataKey="total" name="Total" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Heatmap ─────────────────────────────────────────────────────────────── */
function HeatmapSection({ data, groupBy, onGroupChange }) {
  const getColor = (val) => {
    if (val >= 80) return 'bg-green-500 text-white'
    if (val >= 60) return 'bg-green-300 text-green-900'
    if (val >= 40) return 'bg-yellow-300 text-yellow-900'
    if (val >= 20) return 'bg-orange-300 text-orange-900'
    return 'bg-red-200 text-red-800'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Group by:</span>
        <div className="flex gap-2">
          {['department', 'manager'].map(g => (
            <button key={g} onClick={() => onGroupChange(g)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                groupBy === g ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="text-gray-500">Completion rate:</span>
        {[
          { label: '0–19%', cls: 'bg-red-200' },
          { label: '20–39%', cls: 'bg-orange-300' },
          { label: '40–59%', cls: 'bg-yellow-300' },
          { label: '60–79%', cls: 'bg-green-300' },
          { label: '80–100%', cls: 'bg-green-500' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>

      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 capitalize">{groupBy}</th>
                {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                  <th key={q} className="text-center py-3 px-4 font-semibold text-gray-600 w-24">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">{row.name}</td>
                  {['q1', 'q2', 'q3', 'q4'].map(q => (
                    <td key={q} className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg font-semibold text-sm ${getColor(row[q])}`}>
                        {row[q]}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bar chart view */}
      {data.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Completion Rate by {groupBy} — Bar View</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => [`${v}%`]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              {['q1', 'q2', 'q3', 'q4'].map((q, i) => (
                <Bar key={q} dataKey={q} name={q.toUpperCase()} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ── Distribution ────────────────────────────────────────────────────────── */
function DistributionSection({ data }) {
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="600">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">Total Goals</p>
          <p className="text-4xl font-bold text-brand-600 mt-1">{data.total_goals}</p>
          <p className="text-xs text-gray-400 mt-1">across all employees</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">Thrust Areas</p>
          <p className="text-4xl font-bold text-emerald-600 mt-1">{data.by_thrust_area?.length}</p>
          <p className="text-xs text-gray-400 mt-1">unique areas</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">UoM Types</p>
          <p className="text-4xl font-bold text-amber-600 mt-1">{data.by_uom_type?.length}</p>
          <p className="text-xs text-gray-400 mt-1">measurement types</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Thrust Area */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-4">By Thrust Area</h3>
          {data.by_thrust_area?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.by_thrust_area}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  label={CustomLabel}
                >
                  {data.by_thrust_area.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart small />}
        </div>

        {/* By UoM */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-4">By UoM Type</h3>
          {data.by_uom_type?.length ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.by_uom_type} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category" dataKey="label" width={130}
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => {
                      const map = { numeric_min: 'Numeric (↑)', numeric_max: 'Numeric (↓)', timeline: 'Timeline', zero: 'Zero-based' }
                      return map[v] || v
                    }}
                  />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {data.by_uom_type.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {data.by_uom_type.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-semibold">{item.count} <span className="text-gray-400 font-normal">({item.percentage}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyChart small />}
        </div>

        {/* By Status */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Goal Status Distribution</h3>
          {data.by_status?.length ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.by_status}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {data.by_status.map((entry, i) => {
                      const colorMap = { not_started: '#e5e7eb', on_track: '#fbbf24', completed: '#10b981' }
                      return <Cell key={i} fill={colorMap[entry.label] || COLORS[i]} />
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 min-w-48">
                {data.by_status.map((item, i) => {
                  const colorMap = { not_started: 'bg-gray-200', on_track: 'bg-yellow-400', completed: 'bg-green-500' }
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full ${colorMap[item.label] || 'bg-brand-500'}`} />
                      <span className="text-sm text-gray-600 capitalize">{item.label.replace('_', ' ')}</span>
                      <span className="ml-auto font-bold text-sm">{item.percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : <EmptyChart small />}
        </div>
      </div>
    </div>
  )
}

/* ── Manager Effectiveness ───────────────────────────────────────────────── */
function ManagerSection({ data }) {
  if (!data.length) return <EmptyChart />

  const chartData = data.map(m => ({
    name: m.manager_name.split(' ')[0],
    full_name: m.manager_name,
    completion_rate: m.completion_rate,
    checkins_done: m.checkins_done,
    team_size: m.total_team,
  }))

  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Check-in Completion Leaderboard</h3>
        <div className="space-y-3">
          {data.map((mgr, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0 ? 'bg-yellow-400 text-yellow-900' :
                i === 1 ? 'bg-gray-300 text-gray-700' :
                i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900 truncate">{mgr.manager_name}</span>
                  <span className="text-gray-500 shrink-0 ml-2">{mgr.checkins_done}/{mgr.max_possible_checkins}</span>
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${mgr.completion_rate >= 75 ? 'bg-green-500' : mgr.completion_rate >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                    style={{ width: `${mgr.completion_rate}%` }}
                  />
                </div>
              </div>
              <span className={`text-sm font-bold w-14 text-right shrink-0 ${
                mgr.completion_rate >= 75 ? 'text-green-600' :
                mgr.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-500'
              }`}>
                {mgr.completion_rate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Check-in Rate vs Team Size</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" />
            <YAxis yAxisId="left" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              formatter={(v, name) => name === 'completion_rate' ? [`${v}%`, 'Completion Rate'] : [v, 'Team Size']}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="completion_rate" name="Completion Rate (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="team_size" name="Team Size" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Detailed Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Manager</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-600">Department</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">Team Size</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">Active Sheets</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">Check-ins Done</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">Max Possible</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((mgr, i) => (
              <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-3 font-medium">{mgr.manager_name}</td>
                <td className="py-3 px-3 text-gray-500">{mgr.department}</td>
                <td className="py-3 px-3 text-center">{mgr.total_team}</td>
                <td className="py-3 px-3 text-center">{mgr.total_sheets}</td>
                <td className="py-3 px-3 text-center">{mgr.checkins_done}</td>
                <td className="py-3 px-3 text-center text-gray-400">{mgr.max_possible_checkins}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`font-bold ${
                    mgr.completion_rate >= 75 ? 'text-green-600' :
                    mgr.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {mgr.completion_rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptyChart({ small = false }) {
  return (
    <div className={`text-center ${small ? 'py-8' : 'py-20'} text-gray-400`}>
      <p className="text-3xl mb-2">📊</p>
      <p className="text-sm">No data available for this period</p>
    </div>
  )
}
