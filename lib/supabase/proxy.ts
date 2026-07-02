import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { PASSWORD_SETUP_FLOW_COOKIE } from '@/lib/auth/password-setup-flow'

const AUTH_USER_ID_HEADER = 'x-authenticated-user-id'
const AUTH_USER_EMAIL_HEADER = 'x-authenticated-user-email'

function isEmployeeAuthFlowRequest(request: NextRequest) {
  if (request.nextUrl.pathname === '/reset-password') {
    if (request.cookies.get(PASSWORD_SETUP_FLOW_COOKIE)?.value === 'recovery') {
      return true
    }

    return (
      request.nextUrl.searchParams.has('token_hash') ||
      request.nextUrl.searchParams.has('code') ||
      request.nextUrl.searchParams.has('error') ||
      request.nextUrl.searchParams.has('error_code') ||
      request.nextUrl.searchParams.has('error_description')
    )
  }

  if (request.nextUrl.pathname === '/employee-invite/accept') {
    if (request.cookies.get(PASSWORD_SETUP_FLOW_COOKIE)?.value === 'invite') {
      return true
    }

    return request.nextUrl.searchParams.has('error')
      || request.nextUrl.searchParams.has('error_code')
      || request.nextUrl.searchParams.has('error_description')
  }

  return false
}

function withAuthenticatedUserHeaders(
  request: NextRequest,
  response: NextResponse,
  claims: Record<string, unknown> | null | undefined,
) {
  const requestHeaders = new Headers(request.headers)
  const userId = typeof claims?.sub === 'string' ? claims.sub : null
  const userEmail = typeof claims?.email === 'string' ? claims.email : null

  if (userId && userEmail) {
    requestHeaders.set(AUTH_USER_ID_HEADER, userId)
    requestHeaders.set(AUTH_USER_EMAIL_HEADER, userEmail)
  } else {
    requestHeaders.delete(AUTH_USER_ID_HEADER)
    requestHeaders.delete(AUTH_USER_EMAIL_HEADER)
  }

  const nextResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    nextResponse.cookies.set(name, value, options)
  })

  return nextResponse
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  let user = null
  
  try {
    const { data } = await supabase.auth.getClaims()
    user = data?.claims
  } catch (error) {
    // Network errors or timeouts - log but don't redirect if user has valid cookies
    // This prevents redirecting authenticated users when network is temporarily unavailable
    console.error('[Auth Middleware] Error checking claims:', error)
    
    // If user has a session cookie, trust it and continue
    // The page-level auth checks will still validate the session
    if (request.cookies.has('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0])) {
      return supabaseResponse
    }
  }

  if (user) {
    if (request.nextUrl.pathname.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/cases'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (
      (
        request.nextUrl.pathname.startsWith('/reset-password') ||
        request.nextUrl.pathname.startsWith('/employee-invite/accept')
      ) &&
      !isEmployeeAuthFlowRequest(request)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/cases'
      url.search = ''
      return NextResponse.redirect(url)
    }

    return withAuthenticatedUserHeaders(request, supabaseResponse, user)
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/reset-password') &&
    !request.nextUrl.pathname.startsWith('/employee-invite') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api/auth') &&
    !request.nextUrl.pathname.startsWith('/api/employee-invites')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
