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
  emailVerified?: boolean
  phoneVerified?: boolean
  authProvider?: string
}

export type RegisterPayload = {
  email: string
  password: string
  fullName: string
  phone: string
  deliveryLine1?: string
  deliveryLine2?: string
  deliveryCity?: string
  deliveryState?: string
  deliveryPostcode?: string
}

export type AuthConfig = {
  verificationEnabled: boolean
  googleEnabled: boolean
  appleEnabled: boolean
  googleClientId: string
  appleClientId: string
  emailConfigured: boolean
  smsConfigured: boolean
}

export type ProfilePayload = {
  fullName: string
  phone: string
  deliveryLine1?: string
  deliveryLine2?: string
  deliveryCity?: string
  deliveryState?: string
  deliveryPostcode?: string
}

type AuthContextValue = {
  user: CustomerUser | null
  loading: boolean
  authConfig: AuthConfig | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<{ devCodes?: { email?: string; phone?: string } }>
  logout: () => Promise<void>
  updateProfile: (payload: ProfilePayload) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ devCode?: string }>
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  verifyEmail: (code: string) => Promise<void>
  verifyPhone: (code: string) => Promise<void>
  resendEmailCode: () => Promise<{ devCodes?: { email?: string } }>
  resendPhoneCode: (phone?: string) => Promise<{ devCodes?: { phone?: string } }>
  signInWithGoogle: (credential: string) => Promise<void>
  signInWithApple: (credential: string, fullName?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function needsAccountVerification(user: CustomerUser | null, verificationEnabled = false) {
  return Boolean(verificationEnabled && user && (!user.emailVerified || !user.phoneVerified))
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)

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
    Promise.all([
      refresh(),
      fetch(apiUrl('/api/auth/config'))
        .then((r) => r.json())
        .then((data) => setAuthConfig(data as AuthConfig))
        .catch(() => setAuthConfig(null)),
    ]).finally(() => setLoading(false))
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

  const register = async (payload: RegisterPayload) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Registration failed')
    await refresh()
    return { devCodes: data.devCodes as { email?: string; phone?: string } | undefined }
  }

  const logout = async () => {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  const updateProfile = async (payload: ProfilePayload) => {
    const res = await fetch(apiUrl('/api/auth/me'), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Could not update profile')
    if (data.user) setUser(data.user as CustomerUser)
    else await refresh()
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch(apiUrl('/api/auth/change-password'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Could not change password')
  }

  const requestPasswordReset = async (email: string) => {
    const res = await fetch(apiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Could not send reset code')
    return { devCode: data.devCode as string | undefined }
  }

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    const res = await fetch(apiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Could not reset password')
  }

  const verifyEmail = async (code: string) => {
    const res = await fetch(apiUrl('/api/auth/verify-email'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Email verification failed')
    setUser(data.user as CustomerUser)
  }

  const verifyPhone = async (code: string) => {
    const res = await fetch(apiUrl('/api/auth/verify-phone'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Phone verification failed')
    setUser(data.user as CustomerUser)
  }

  const resendEmailCode = async () => {
    const res = await fetch(apiUrl('/api/auth/resend-email'), {
      method: 'POST',
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Could not resend email code')
    return { devCodes: data.devCodes as { email?: string } | undefined }
  }

  const resendPhoneCode = async (phone?: string) => {
    const res = await fetch(apiUrl('/api/auth/resend-phone'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(phone ? { phone } : {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Could not resend phone code')
    if (data.user) setUser(data.user as CustomerUser)
    return { devCodes: data.devCodes as { phone?: string } | undefined }
  }

  const signInWithGoogle = async (credential: string) => {
    const res = await fetch(apiUrl('/api/auth/google'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Google sign-in failed')
    setUser(data.user as CustomerUser)
  }

  const signInWithApple = async (credential: string, fullName?: string) => {
    const res = await fetch(apiUrl('/api/auth/apple'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, fullName }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message ?? 'Apple sign-in failed')
    setUser(data.user as CustomerUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authConfig,
        refresh,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        requestPasswordReset,
        resetPassword,
        verifyEmail,
        verifyPhone,
        resendEmailCode,
        resendPhoneCode,
        signInWithGoogle,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  return ctx
}
