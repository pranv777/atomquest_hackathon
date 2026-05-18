import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyGoals from './pages/MyGoals'
import Achievements from './pages/Achievements'
import TeamGoals from './pages/TeamGoals'
import Checkins from './pages/Checkins'
import Reports from './pages/Reports'
import Analytics from './pages/Analytics'
import Users from './pages/Users'
import AuditLogs from './pages/AuditLogs'

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/my-goals" element={
        <ProtectedRoute roles={['employee', 'manager', 'admin']}><MyGoals /></ProtectedRoute>
      } />
      <Route path="/achievements" element={
        <ProtectedRoute roles={['employee']}><Achievements /></ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute roles={['manager', 'admin']}><TeamGoals /></ProtectedRoute>
      } />
      <Route path="/checkins" element={
        <ProtectedRoute roles={['manager', 'admin']}><Checkins /></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute roles={['manager', 'admin']}><Reports /></ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute roles={['manager', 'admin']}><Analytics /></ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>
      } />
      <Route path="/audit" element={
        <ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm',
            duration: 3500,
            style: { borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
