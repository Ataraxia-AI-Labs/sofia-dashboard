import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// API base URL for the FastAPI backend
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ataraxia-api-core.onrender.com'
