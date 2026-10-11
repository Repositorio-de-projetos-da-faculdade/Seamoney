'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { safeCompare, signSession } from '@/lib/gate'

export async function unlock(formData: FormData) {
  const pwd = process.env.DEMO_ACCESS_PASSWORD
  const secret = process.env.DEMO_SESSION_SECRET || 'default-secret'
  
  if (!pwd) {
    redirect('/')
  }
  
  const input = formData.get('password') as string
  if (!input || !safeCompare(input, pwd)) {
    return { error: 'unlock.error' }
  }
  
  const timestamp = Date.now()
  const cookieVal = signSession(timestamp, secret)
  
  const cookieStore = await cookies()
  cookieStore.set('seamoney_session', cookieVal, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60, // 12 hours
    path: '/'
  })
  
  redirect('/')
}
