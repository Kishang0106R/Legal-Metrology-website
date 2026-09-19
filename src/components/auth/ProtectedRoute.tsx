import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types/auth'

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <div className="auth-loading"><div className="loading-ring" /><p>Checking your secure session...</p></div>
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!auth.profile) return <Navigate to="/access-denied" replace />
  if (auth.profile.status === 'inactive' || auth.profile.status === 'suspended') return <Navigate to="/account-inactive" replace />
  if (auth.profile.status === 'pending') return <Navigate to="/account-pending" replace />
  if (roles && !roles.includes(auth.profile.role)) return <Navigate to="/access-denied" replace />
  return <>{children}</>
}

export function RoleRoute({ children, roles }: { children: React.ReactNode; roles: Role[] }) { return <ProtectedRoute roles={roles}>{children}</ProtectedRoute> }
