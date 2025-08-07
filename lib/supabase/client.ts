import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://okvrxpjincelvvwnvcts.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnJ4cGppbmNlbHZ2d252Y3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTM1NzcsImV4cCI6MjA3MDEyOTU3N30.R4QwWmbd8tcuJQu3hU1yuxaGrh18khTg_J_ujo-9Szk'
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
