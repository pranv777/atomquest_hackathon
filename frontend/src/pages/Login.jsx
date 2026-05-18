import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (email, password) => {
    setForm({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚛</div>
          <h1 className="text-3xl font-bold text-white">AtomQuest</h1>
          <p className="text-brand-100 mt-2">Goal Setting & Tracking Portal</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick login for demo */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Demo credentials</p>
            <div className="space-y-2">
              {[
                { label: '🔧 Admin', email: 'admin@atomquest.com', pass: 'Admin@123' },
                { label: '👔 Manager', email: 'manager@atomquest.com', pass: 'Manager@123' },
                { label: '👤 Employee', email: 'employee@atomquest.com', pass: 'Employee@123' },
              ].map(item => (
                <button
                  key={item.email}
                  onClick={() => quickLogin(item.email, item.pass)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm transition-colors"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-400 ml-2">{item.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
