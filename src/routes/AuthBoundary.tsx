import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'

export function AuthBoundary() {
  return <AuthProvider><Outlet /></AuthProvider>
}
