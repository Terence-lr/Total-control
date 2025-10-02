import { supabase } from './config'
import { User, AuthError } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email?: string
  full_name?: string
  avatar_url?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

export const auth = {
  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      return null
    }
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user as AuthUser | null
  },

  // Sign up with email and password
  async signUp(email: string, password: string) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Sign in with Google
  async signInWithGoogle() {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') }
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    if (!supabase) {
      return { error: new Error('Supabase client not initialized') }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user as AuthUser | null)
    })
  },

  // Reset password
  async resetPassword(email: string) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') }
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { data, error }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: { full_name?: string; avatar_url?: string }) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client not initialized') }
    }
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  }
}
