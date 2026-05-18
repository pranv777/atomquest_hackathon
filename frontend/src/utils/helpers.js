export const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  returned: 'bg-red-100 text-red-700',
  not_started: 'bg-gray-100 text-gray-600',
  on_track: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export const UOM_LABELS = {
  numeric_min: 'Numeric (Higher is Better)',
  numeric_max: 'Numeric (Lower is Better)',
  timeline: 'Timeline (Date-based)',
  zero: 'Zero-based',
}

export const QUARTER_LABELS = {
  q1: 'Q1 (July)',
  q2: 'Q2 (October)',
  q3: 'Q3 (January)',
  q4: 'Q4 / Annual (March-April)',
}

export function formatScore(score) {
  if (score == null) return '—'
  return `${(score * 100).toFixed(1)}%`
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
