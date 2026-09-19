import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { recordAudit } from '../services/audit'
import type { Profile, Role } from '../types/auth'

export type AuthContextValue = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  configured: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUpBusiness: (input: { email: string; password: string; fullName: string; phone: string; businessName: string; businessType: string; registrationNumber: string; address: string; state: string; district: string }) => Promise<{ error: AuthError | Error | null }>
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  hasRole: (roles: Role | Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function friendlyError(error: AuthError | Error | null) {
  if (!error) return null
  const message = error.message.toLowerCase()
  if (message.includes('invalid login')) return 'The email or password is incorrect.'
  if (message.includes('email not confirmed')) return 'Please confirm your email before signing in.'
  if (message.includes('user already registered')) return 'An account with this email already exists.'
  return 'We could not complete that request. Please try again.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) { setLoading(false); return }
    let mounted = true
    const loadProfile = async (nextSession: Session | null) => {
      if (!mounted) return
      setSession(nextSession)
      if (!nextSession) { setProfile(null); setLoading(false); return }
      const { data, error: profileError } = await client.from('profiles').select('*').eq('auth_user_id', nextSession.user.id).single()
      if (!mounted) return
      setProfile(data as Profile | null)
      setError(profileError ? 'Your account profile could not be loaded. Please contact an administrator.' : null)
      setLoading(false)
    }
    client.auth.getSession().then(({ data }) => loadProfile(data.session))
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => { void loadProfile(nextSession) })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null, profile, session, loading, configured: Boolean(supabase), error,
    signIn: async (email, password) => { if (!supabase) return { error: new Error('Supabase is not configured') as AuthError }; const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) setError(friendlyError(result.error)); else void recordAudit('login', 'auth_session'); return { error: result.error } },
    signUpBusiness: async (input) => { if (!supabase) return { error: new Error('Supabase is not configured') }; const { data, error: signUpError } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: { full_name: input.fullName, user_type: 'business', phone: input.phone, business_name: input.businessName, business_type: input.businessType, registration_number: input.registrationNumber, address: input.address, state: input.state, district: input.district } } }); if (signUpError) setError(friendlyError(signUpError)); if (data.user && !data.session) setError('Check your email to confirm the business account.'); return { error: signUpError } },
    sendPasswordReset: async (email) => { if (!supabase) return { error: new Error('Supabase is not configured') as AuthError }; const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (result.error) setError(friendlyError(result.error)); return result },
    updatePassword: async (password) => { if (!supabase) return { error: new Error('Supabase is not configured') as AuthError }; const result = await supabase.auth.updateUser({ password }); if (result.error) setError(friendlyError(result.error)); return result },
    signOut: async () => { if (!supabase) return { error: null }; void recordAudit('logout', 'auth_session'); const result = await supabase.auth.signOut(); if (result.error) setError(friendlyError(result.error)); return result },
    hasRole: (roles) => Boolean(profile && (Array.isArray(roles) ? roles : [roles]).includes(profile.role)),
  }), [error, loading, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }
