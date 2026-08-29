import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Eye, EyeOff, Leaf, LockKeyhole, Mail, MapPin, Package, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomerAuth, type CustomerUser } from '@/context/CustomerAuthContext'
import { staticUrl } from '@/utils/staticUrl'

const GOLD_BTN =
  'inline-flex h-11 w-full items-center justify-center rounded-sm font-body text-sm font-semibold tracking-wide text-white shadow-[0_4px_16px_rgba(119,90,25,0.28)] transition hover:brightness-105 disabled:opacity-60'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          renderButton: (element: HTMLElement, config: Record<string, string>) => void
        }
      }
    }
    AppleID?: {
      auth: {
        init: (config: Record<string, string | boolean>) => void
        signIn: () => Promise<{
          authorization: { id_token: string }
          user?: { name?: { firstName?: string; lastName?: string } }
        }>
      }
    }
  }
}

type AuthView = 'login' | 'register' | 'forgot' | 'reset'

function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  paidBanner,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
  paidBanner?: ReactNode
}) {
  return (
    <main className="relative min-h-[82vh] overflow-hidden bg-gradient-to-b from-sand/60 via-white to-surface px-5 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(197,160,89,0.18),_transparent_65%)]" />
      <div className="relative mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-parchment/80 bg-white shadow-[0_20px_60px_rgba(26,18,8,0.08)]">
          <div className="grid lg:grid-cols-[minmax(280px,340px)_1fr]">
            <aside className="relative hidden min-h-[34rem] flex-col justify-between overflow-hidden bg-charcoal p-8 text-white lg:flex">
              <img
                src={staticUrl('/images/farm/omaru-account-illustration.png')}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,14,0.36)_0%,rgba(33,31,18,0.2)_45%,rgba(30,25,10,0.66)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(197,160,89,0.22),transparent_38%)]" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <img src={staticUrl('/images/farm/omaru-logo.png')} alt="" className="h-11 w-11 rounded-full bg-white/10 p-1" />
                  <div>
                    <p className="font-heading text-2xl leading-none">Omaru Farm</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/75">Phillip Island</p>
                  </div>
                </div>
                <p className="mt-8 font-heading text-3xl leading-tight">Your farm account</p>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  Track store orders, manage stay bookings, save cards, and checkout faster with your details on file.
                </p>
              </div>
              <ul className="relative mt-8 space-y-3 text-sm text-white/90">
                <li className="flex items-center gap-2">
                  <Package className="h-4 w-4 shrink-0" />
                  Order history &amp; tracking
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Verified email &amp; mobile
                </li>
                <li className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 shrink-0" />
                  Saved delivery details
                </li>
              </ul>
            </aside>

            <div className="p-6 md:p-10 lg:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
              <h1 className="mt-2 font-heading text-4xl text-charcoal md:text-[2.5rem]">{title}</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-stone">{subtitle}</p>
              {paidBanner}
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function AuthTabs({ view, setView }: { view: 'login' | 'register'; setView: (view: 'login' | 'register') => void }) {
  return (
    <div className="mb-6 inline-flex rounded-full border border-parchment bg-surface/50 p-1">
      {(['login', 'register'] as const).map((tab) => {
        const active = view === tab
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active ? 'bg-white text-charcoal shadow-sm ring-1 ring-parchment' : 'text-stone hover:text-charcoal'
            }`}
          >
            {tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        )
      })}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-stone">{children}</span>
}

function SocialSignInButtons({ mode }: { mode: 'login' | 'register' }) {
  const { authConfig, signInWithGoogle, signInWithApple } = useCustomerAuth()
  const googleRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authConfig?.googleEnabled || !authConfig.googleClientId || !googleRef.current) return
    const mount = () => {
      if (!window.google || !googleRef.current) return
      window.google.accounts.id.initialize({
        client_id: authConfig.googleClientId,
        callback: (response) => {
          if (!response.credential) return
          setError('')
          signInWithGoogle(response.credential).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Google sign-in failed')
          })
        },
      })
      googleRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'register' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        width: '360',
      })
    }
    if (window.google) {
      mount()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = mount
    document.body.appendChild(script)
  }, [authConfig, mode, signInWithGoogle])

  useEffect(() => {
    if (!authConfig?.appleEnabled || !authConfig.appleClientId || window.AppleID) return
    const script = document.createElement('script')
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
    script.async = true
    document.body.appendChild(script)
  }, [authConfig])

  const appleSignIn = async () => {
    if (!authConfig?.appleEnabled || !authConfig.appleClientId) return
    setError('')
    try {
      window.AppleID?.auth.init({
        clientId: authConfig.appleClientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/account`,
        usePopup: true,
      })
      const result = await window.AppleID?.auth.signIn()
      const token = result?.authorization?.id_token
      if (!token) throw new Error('Apple sign-in was cancelled')
      const first = result.user?.name?.firstName ?? ''
      const last = result.user?.name?.lastName ?? ''
      await signInWithApple(token, `${first} ${last}`.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple sign-in failed')
    }
  }

  if (!authConfig?.googleEnabled && !authConfig?.appleEnabled) return null

  return (
    <div className="space-y-3">
      {authConfig.googleEnabled ? <div ref={googleRef} className="flex justify-center overflow-hidden rounded-sm" /> : null}
      {authConfig.appleEnabled ? (
        <Button type="button" variant="outline" className="h-11 w-full bg-charcoal text-white hover:bg-charcoal/90" onClick={() => void appleSignIn()}>
          Continue with Apple
        </Button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone">
        <span className="h-px flex-1 bg-parchment" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-parchment" />
      </div>
    </div>
  )
}

export function AccountVerificationPanel({ user }: { user: CustomerUser }) {
  const { verifyEmail, verifyPhone, resendEmailCode, resendPhoneCode } = useCustomerAuth()
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [devHint, setDevHint] = useState('')

  return (
    <AuthShell eyebrow="Almost there" title="Verify your account" subtitle="Enter the codes we sent to your email and mobile.">
      {message ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p> : null}
      {devHint ? <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{devHint}</p> : null}
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {!user.emailVerified ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy('email')
            setError('')
            try {
              await verifyEmail(emailCode)
              setMessage('Email verified.')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Email verification failed')
            } finally {
              setBusy('')
            }
          }}
          className="space-y-3 rounded-xl border border-parchment bg-surface/20 p-5"
        >
          <div className="flex items-center gap-2 text-charcoal">
            <Mail className="h-4 w-4 text-gold" />
            <h2 className="font-semibold">Email verification</h2>
          </div>
          <p className="text-sm text-stone">Code sent to {user.email}</p>
          <input className="field" inputMode="numeric" placeholder="6-digit email code" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} required />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={GOLD_BTN} disabled={busy === 'email'} style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}>
              {busy === 'email' ? 'Verifying…' : 'Verify email'}
            </button>
            <Button type="button" variant="outline" disabled={busy === 'email-resend'} onClick={async () => {
              setBusy('email-resend')
              setError('')
              try {
                const result = await resendEmailCode()
                setMessage('Email code sent again.')
                if (result.devCodes?.email) setDevHint(`Dev email code: ${result.devCodes.email}`)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not resend email code')
              } finally {
                setBusy('')
              }
            }}>
              Resend
            </Button>
          </div>
        </form>
      ) : null}

      {!user.phoneVerified ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy('phone')
            setError('')
            try {
              await verifyPhone(phoneCode)
              setMessage('Mobile number verified.')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Phone verification failed')
            } finally {
              setBusy('')
            }
          }}
          className="mt-4 space-y-3 rounded-xl border border-parchment bg-surface/20 p-5"
        >
          <div className="flex items-center gap-2 text-charcoal">
            <Sparkles className="h-4 w-4 text-gold" />
            <h2 className="font-semibold">Mobile verification</h2>
          </div>
          <input className="field" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className="field" inputMode="numeric" placeholder="6-digit SMS code" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} required />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={GOLD_BTN} disabled={busy === 'phone'} style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}>
              {busy === 'phone' ? 'Verifying…' : 'Verify mobile'}
            </button>
            <Button type="button" variant="outline" disabled={busy === 'phone-resend'} onClick={async () => {
              setBusy('phone-resend')
              setError('')
              try {
                const result = await resendPhoneCode(phone)
                setMessage('SMS code sent again.')
                if (result.devCodes?.phone) setDevHint(`Dev SMS code: ${result.devCodes.phone}`)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not resend SMS code')
              } finally {
                setBusy('')
              }
            }}>
              Resend SMS
            </Button>
          </div>
        </form>
      ) : null}
    </AuthShell>
  )
}

export function CustomerAuthPanel({
  mode,
  setMode,
  paidBanner,
}: {
  mode: 'login' | 'register'
  setMode: (mode: 'login' | 'register') => void
  paidBanner?: ReactNode
}) {
  const { login, register, requestPasswordReset, resetPassword } = useCustomerAuth()
  const [view, setView] = useState<AuthView>(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryLine1, setDeliveryLine1] = useState('')
  const [deliveryLine2, setDeliveryLine2] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryState, setDeliveryState] = useState('VIC')
  const [deliveryPostcode, setDeliveryPostcode] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [devHint, setDevHint] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (view === 'login' || view === 'register') setMode(view)
  }, [view, setMode])

  const onLoginRegister = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setDevHint('')
    try {
      if (view === 'login') {
        await login(email, password)
      } else {
        const result = await register({
          email,
          password,
          fullName,
          phone,
          deliveryLine1,
          deliveryLine2,
          deliveryCity,
          deliveryState,
          deliveryPostcode,
        })
        if (result.devCodes?.email || result.devCodes?.phone) {
          setDevHint(`Dev codes — email: ${result.devCodes.email ?? '—'}, SMS: ${result.devCodes.phone ?? '—'}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  if (view === 'forgot') {
    return (
      <AuthShell eyebrow="Account help" title="Reset your password" subtitle="Enter the email for your account and we will send a reset code." paidBanner={paidBanner}>
        <form onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          setDevHint('')
          try {
            const result = await requestPasswordReset(email)
            setMessage('If an account exists, a reset code has been sent.')
            if (result.devCode) setDevHint(`Dev reset code: ${result.devCode}`)
            setView('reset')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send reset code')
          } finally {
            setBusy(false)
          }
        }} className="space-y-4">
          <label className="block">
            <FieldLabel>Email</FieldLabel>
            <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {devHint ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{devHint}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className={GOLD_BTN} disabled={busy} style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}>
            {busy ? 'Sending…' : 'Send reset code'}
          </button>
          <button type="button" className="text-sm text-gold hover:underline" onClick={() => setView('login')}>Back to sign in</button>
        </form>
      </AuthShell>
    )
  }

  if (view === 'reset') {
    return (
      <AuthShell eyebrow="Account help" title="Choose a new password" subtitle="Enter the code from your email and your new password." paidBanner={paidBanner}>
        <form onSubmit={async (e) => {
          e.preventDefault()
          if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
          }
          setBusy(true)
          setError('')
          try {
            await resetPassword(email, resetCode, newPassword)
            setMessage('Password updated. You can sign in now.')
            setView('login')
            setPassword('')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset password')
          } finally {
            setBusy(false)
          }
        }} className="space-y-4">
          <label className="block"><FieldLabel>Email</FieldLabel><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><FieldLabel>Reset code</FieldLabel><input className="field" inputMode="numeric" required value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="6-digit code" /></label>
          <label className="block"><FieldLabel>New password</FieldLabel><input className="field" type="password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
          <label className="block"><FieldLabel>Confirm password</FieldLabel><input className="field" type="password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className={GOLD_BTN} disabled={busy} style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
          <button type="button" className="text-sm text-gold hover:underline" onClick={() => setView('forgot')}>Resend code</button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow={view === 'login' ? 'Welcome back' : 'Join Omaru Farm'}
      title={view === 'login' ? 'Sign in to your account' : 'Create your account'}
      subtitle={view === 'login' ? 'Access your orders, stay bookings, and saved payment methods.' : 'Register to track orders, save your details, and checkout faster next time.'}
      paidBanner={paidBanner}
    >
      <AuthTabs view={view} setView={setView} />
      <SocialSignInButtons mode={view} />
      <form onSubmit={onLoginRegister} className="mt-6 space-y-4">
        {view === 'register' ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2"><FieldLabel>Full name</FieldLabel><input className="field" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" /></label>
              <label className="block"><FieldLabel>Mobile</FieldLabel><input className="field" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" /></label>
              <label className="block"><FieldLabel>Email</FieldLabel><input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            </div>
            <label className="block">
              <FieldLabel>Password</FieldLabel>
              <span className="relative block">
                <input className="field pr-11" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone transition hover:text-charcoal">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              <span className="mt-1.5 block text-xs text-stone">Use at least 8 characters.</span>
            </label>
            <div className="rounded-xl border border-parchment/80 bg-surface/30">
              <button type="button" aria-expanded={showAddress} onClick={() => setShowAddress((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <span className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                  <MapPin className="h-4 w-4 text-gold" />
                  Add a default delivery address
                  <span className="font-normal text-stone">(optional)</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-stone transition-transform ${showAddress ? 'rotate-180' : ''}`} />
              </button>
              {showAddress ? <div className="space-y-3 border-t border-parchment/70 p-4">
                <input className="field" autoComplete="address-line1" placeholder="Street address" value={deliveryLine1} onChange={(e) => setDeliveryLine1(e.target.value)} />
                <input className="field" autoComplete="address-line2" placeholder="Unit / apartment (optional)" value={deliveryLine2} onChange={(e) => setDeliveryLine2(e.target.value)} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input className="field" autoComplete="address-level2" placeholder="Suburb" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
                  <input className="field" autoComplete="address-level1" placeholder="State" value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)} />
                  <input className="field" autoComplete="postal-code" inputMode="numeric" placeholder="Postcode" value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} />
                </div>
              </div> : null}
            </div>
          </>
        ) : (
          <>
            <label className="block"><FieldLabel>Email</FieldLabel><input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label className="block">
              <FieldLabel>Password</FieldLabel>
              <span className="relative block">
                <input className="field pr-11" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone transition hover:text-charcoal">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            <button type="button" className="inline-flex items-center gap-1 text-sm text-gold hover:underline" onClick={() => setView('forgot')}>
              <LockKeyhole className="h-3.5 w-3.5" />
              Forgot password?
            </button>
          </>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {devHint ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{devHint}</p> : null}
        <button type="submit" className={GOLD_BTN} disabled={busy} style={{ background: 'linear-gradient(135deg, #775a19 0%, #c5a059 100%)' }}>
          {busy ? 'Please wait…' : view === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-stone">
        By continuing you agree to our <Link to="/terms" className="text-gold hover:underline">Terms</Link> and <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
      </p>
    </AuthShell>
  )
}
