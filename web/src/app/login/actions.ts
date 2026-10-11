'use server'

import { redirect } from 'next/navigation'
import type { Key } from '@/lib/i18n/dict'
import { requestToken } from '@/lib/login'
import { safeNext } from '@/lib/safeNext'
import { clearSession, storeSession } from '@/lib/session'

export type SignInState = { error: Key } | null

/** Checks the credentials with the Java service and keeps its token in the httpOnly session cookie. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const result = await requestToken(String(formData.get('email') ?? '').trim(), String(formData.get('password') ?? ''))
  if ('error' in result) return { error: result.error }
  await storeSession(result.token)
  redirect(safeNext(formData.get('next')))
}

export async function signOut() {
  await clearSession()
  redirect('/login')
}
