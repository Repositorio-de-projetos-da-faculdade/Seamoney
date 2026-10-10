import { NextResponse } from 'next/server'
import { ExtractionError } from './extract'

/** Turns the extraction error into an HTTP response. Unknown errors are logged, not leaked. */
export function fail(e: unknown) {
  if (e instanceof ExtractionError) {
    return NextResponse.json({ error: e.message, code: 'extraction' }, { status: 502 })
  }
  console.error(e)
  return NextResponse.json({ error: 'Unexpected error', code: 'internal' }, { status: 500 })
}
