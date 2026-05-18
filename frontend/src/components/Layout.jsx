import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/helpers'

const NAV = {
  employee: [
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/my-goals', icon: '🎯', label: 'My Goals' },
    { to: '/achievements', icon: '📊', label: 'Achievements' },
  ],
  manager: [
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/my-goals', icon: '🎯', label: 'My Goals' },
    { to: '/team', icon: '👥', label: 'Team Goals' },
    { to: '/checkins', icon: '✅', label: 'Check-ins' },
    { to: '/reports', icon: '📋', label: 'Reports' },
    { to: '/analytics', icon: '📈', label: 'Analytics' },
  ],
  admin: [
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/team', icon: '👥', label: 'All Goal Sheets' },
    { to: '/users', icon: '👤', label: 'Users' },
    { to: '/reports', icon: '📋', label: 'Reports' },
    { to: '/analytics', icon: '📈', label: 'Analytics' },
    { to: '/audit', icon: '🔍', label: 'Audit Logs' },
  ],
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = NAV[user?.role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-900 flex flex-col shrink-0">
        <div className="p-6 border-b border-brand-700">
          <h1 className="text-white text-xl font-bold">⚛ AtomQuest</h1>
          <p className="text-brand-100 text-xs mt-1">Goal Tracking Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-brand-300 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-brand-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-brand-800 transition-colors"
          >
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
