import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  // 환경 변수에서 URL을 가져오되, 잘못된 형식이면 수정
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://okvrxpjincelvvwnvcts.supabase.co'
  
  // URL이 ttps로 시작하면 https로 수정
  if (supabaseUrl.startsWith('ttps://')) {
    supabaseUrl = 'https://' + supabaseUrl.substring(7)
  }
  
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnJ4cGppbmNlbHZ2d252Y3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTM1NzcsImV4cCI6MjA3MDEyOTU3N30.R4QwWmbd8tcuJQu3hU1yuxaGrh18khTg_J_ujo-9Szk'
  
  console.log('Final Supabase URL:', supabaseUrl) // 디버깅용
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
