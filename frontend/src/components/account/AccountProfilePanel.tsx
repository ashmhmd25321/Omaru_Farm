import { useState, type FormEvent } from 'react'
import { CheckCircle2, Lock, MapPin, Phone, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomerAuth, type CustomerUser } from '@/context/CustomerAuthContext'

function VerifiedBadge({ verified, label }: { verified?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${
        verified
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-amber-50 text-amber-900 ring-amber-200'
      }`}
    >
      {verified ? <CheckCircle2 className="h-3 w-3" /> : null}
      {label}
    </span>
  )
}

export function AccountProfilePanel({ user }: { user: CustomerUser }) {
  const { updateProfile, changePassword, refresh } = useCustomerAuth()
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [deliveryLine1, setDeliveryLine1] = useState(user.deliveryLine1 ?? '')
  const [deliveryLine2, setDeliveryLine2] = useState(user.deliveryLine2 ?? '')
  const [deliveryCity, setDeliveryCity] = useState(user.deliveryCity ?? '')
  const [deliveryState, setDeliveryState] = useState(user.deliveryState ?? 'VIC')
  const [deliveryPostcode, setDeliveryPostcode] = useState(user.deliveryPostcode ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)

  const canChangePassword = user.authProvider === 'local' || !user.authProvider

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileBusy(true)
    setProfileError('')
    setProfileMessage('')
    try {
      await updateProfile({
        fullName,
        phone,
        deliveryLine1,
        deliveryLine2,
        deliveryCity,
        deliveryState,
        deliveryPostcode,
      })
      await refresh()
      setProfileMessage('Profile saved.')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setProfileBusy(false)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordBusy(true)
    setPasswordError('')
    setPasswordMessage('')
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordBusy(false)
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password updated.')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-parchment/80 bg-white p-5 shadow-[0_8px_28px_rgba(26,18,8,0.04)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl text-charcoal">Profile &amp; delivery</h2>
            <p className="mt-1 text-sm text-stone">Update your details for faster checkout and order updates.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <VerifiedBadge verified={user.emailVerified} label={user.emailVerified ? 'Email verified' : 'Email pending'} />
            <VerifiedBadge verified={user.phoneVerified} label={user.phoneVerified ? 'Mobile verified' : 'Mobile pending'} />
          </div>
        </div>

        <form onSubmit={saveProfile} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone">
                <UserRound className="h-3.5 w-3.5" />
                Full name
              </span>
              <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-stone">Email</span>
              <input className="field bg-surface/60" value={user.email} disabled />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone">
                <Phone className="h-3.5 w-3.5" />
                Mobile
              </span>
              <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04xx xxx xxx" />
            </label>
          </div>

          <div className="rounded-xl border border-parchment/80 bg-surface/30 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone">
              <MapPin className="h-3.5 w-3.5" />
              Default delivery address
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="field md:col-span-2" placeholder="Street address" value={deliveryLine1} onChange={(e) => setDeliveryLine1(e.target.value)} />
              <input className="field md:col-span-2" placeholder="Unit / apartment (optional)" value={deliveryLine2} onChange={(e) => setDeliveryLine2(e.target.value)} />
              <input className="field" placeholder="Suburb" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="field" placeholder="State" value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)} />
                <input className="field" placeholder="Postcode" value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} />
              </div>
            </div>
          </div>

          {profileMessage ? <p className="text-sm text-emerald-700">{profileMessage}</p> : null}
          {profileError ? <p className="text-sm text-red-600">{profileError}</p> : null}
          {!user.phoneVerified && phone !== user.phone ? (
            <p className="text-sm text-amber-800">Changing your mobile will require verification again.</p>
          ) : null}

          <Button type="submit" disabled={profileBusy}>
            {profileBusy ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </section>

      {canChangePassword ? (
        <section className="rounded-2xl border border-parchment/80 bg-white p-5 shadow-[0_8px_28px_rgba(26,18,8,0.04)] md:p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gold" />
            <h2 className="font-heading text-2xl text-charcoal">Password</h2>
          </div>
          <p className="mt-1 text-sm text-stone">Change the password you use to sign in with email.</p>

          <form onSubmit={savePassword} className="mt-6 grid max-w-md gap-3">
            <input
              className="field"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <input
              className="field"
              type="password"
              placeholder="New password (8+ characters)"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              className="field"
              type="password"
              placeholder="Confirm new password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {passwordMessage ? <p className="text-sm text-emerald-700">{passwordMessage}</p> : null}
            {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
            <Button type="submit" variant="outline" disabled={passwordBusy}>
              {passwordBusy ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-parchment/80 bg-surface/40 p-5 md:p-6">
          <p className="text-sm text-stone">
            You sign in with {user.authProvider === 'google' ? 'Google' : 'Apple'}. Password changes are managed through that provider.
          </p>
        </section>
      )}
    </div>
  )
}
