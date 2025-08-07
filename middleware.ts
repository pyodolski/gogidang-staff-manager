import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // 세션 정보 새로고침
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // 콜백 경로는 항상 허용
  if (pathname.startsWith('/auth/callback')) {
    return response
  }

  // 로그인하지 않은 사용자가 보호된 페이지에 접근 시 로그인 페이지로 리디렉션
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 로그인한 사용자가 로그인 페이지 접근 시 루트로 리디렉션
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }



  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
