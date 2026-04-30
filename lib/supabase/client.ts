import { createBrowserClient } from '@supabase/ssr'

// 싱글톤 인스턴스 — 매번 새로 만들면 세션 상태가 꼬임
let client: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  if (client) return client

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://okvrxpjincelvvwnvcts.supabase.co'

  if (supabaseUrl.startsWith('ttps://')) {
    supabaseUrl = 'https://' + supabaseUrl.substring(7)
  }

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnJ4cGppbmNlbHZ2d252Y3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTM1NzcsImV4cCI6MjA3MDEyOTU3N30.R4QwWmbd8tcuJQu3hU1yuxaGrh18khTg_J_ujo-9Szk'

  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return client
}
