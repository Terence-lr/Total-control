import { supabase } from './config'
import { PostgrestError } from '@supabase/supabase-js'

// Database types
export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  created_at: string
  updated_at: string
}

export interface Flow {
  id: string
  user_id: string
  name: string
  description?: string
  steps: string[]
  created_at: string
  updated_at: string
}

export interface Routine {
  id: string
  user_id: string
  name: string
  description?: string
  schedule: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Helper function to check if supabase is available
const checkSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  return supabase
}

// Database operations
export const db = {
  // Tasks
  async getTasks(userId: string): Promise<{ data: Task[] | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async getTask(taskId: string, userId: string): Promise<{ data: Task | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Task | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('tasks')
        .insert(task)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async updateTask(taskId: string, userId: string, updates: Partial<Task>): Promise<{ data: Task | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async deleteTask(taskId: string, userId: string): Promise<{ error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId)
      
      return { error }
    } catch (error) {
      return { error: error as any }
    }
  },

  // Flows
  async getFlows(userId: string): Promise<{ data: Flow[] | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('flows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async createFlow(flow: Omit<Flow, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Flow | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('flows')
        .insert(flow)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async updateFlow(flowId: string, userId: string, updates: Partial<Flow>): Promise<{ data: Flow | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('flows')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', flowId)
        .eq('user_id', userId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async deleteFlow(flowId: string, userId: string): Promise<{ error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { error } = await client
        .from('flows')
        .delete()
        .eq('id', flowId)
        .eq('user_id', userId)
      
      return { error }
    } catch (error) {
      return { error: error as any }
    }
  },

  // Routines
  async getRoutines(userId: string): Promise<{ data: Routine[] | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async createRoutine(routine: Omit<Routine, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Routine | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('routines')
        .insert(routine)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async updateRoutine(routineId: string, userId: string, updates: Partial<Routine>): Promise<{ data: Routine | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('routines')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', routineId)
        .eq('user_id', userId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async deleteRoutine(routineId: string, userId: string): Promise<{ error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { error } = await client
        .from('routines')
        .delete()
        .eq('id', routineId)
        .eq('user_id', userId)
      
      return { error }
    } catch (error) {
      return { error: error as any }
    }
  },

  // User profile
  async getUserProfile(userId: string): Promise<{ data: User | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  },

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<{ data: User | null; error: PostgrestError | null }> {
    try {
      const client = checkSupabase()
      const { data, error } = await client
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      return { data: null, error: error as any }
    }
  }
}
