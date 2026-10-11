import type { Metadata } from 'next'
import { getLocale } from '@/lib/i18n/server'
import { safeNext } from '@/lib/safeNext'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, locale] = await Promise.all([searchParams, getLocale()])
  return <LoginForm locale={locale} next={safeNext(next)} />
}
