import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiUrl } from '@/utils/api'

export type CustomerUser = {
  id: number
  email: string
  fullName: string
  phone?: string
  deliveryLine1?: string
  deliveryLine2?: string
  deliveryCity?: string
  deliveryState?: string
  deliveryPostcode?: string
}

type AuthContextValue = {
  user: CustomerUser | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (payload: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = (await res.json()) as { user: CustomerUser }
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Login failed')
    await refresh()
  }

  const register = async (payload: { email: string; password: string; fullName: string; phone?: string }) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Registration failed')
    await refresh()
  }

  const logout = async () => {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  return ctx
}
