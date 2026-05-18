import { STATUS_COLORS } from '../utils/helpers'

export function Badge({ status, label }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`badge ${color}`}>
      {label || status?.replace('_', ' ')}
    </span>
  )
}

export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-brand-600 border-t-transparent`} />
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-16">
      <p className="text-2xl mb-2">📋</p>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function ProgressBar({ score, size = 'md' }) {
  const pct = score != null ? Math.min(score * 100, 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5'
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 rounded-full ${h}`}>
        <div className={`${color} ${h} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'from-brand-500 to-brand-700',
    green: 'from-green-500 to-green-700',
    yellow: 'from-yellow-400 to-yellow-600',
    red: 'from-red-500 to-red-700',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-5 text-white`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  )
}
