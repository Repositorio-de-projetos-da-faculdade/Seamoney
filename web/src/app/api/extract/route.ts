import { NextResponse } from 'next/server'
import { ACCEPTED_TYPES, extractInvoice, MAX_UPLOAD_BYTES } from '@/lib/extract'
import { fail } from '@/lib/http'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a file.' }, { status: 400 })
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: 'Use a PDF, PNG, JPG or WebP file.' }, { status: 415 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'The file is larger than 10 MB.' }, { status: 413 })
    }
    const result = await extractInvoice({ bytes: Buffer.from(await file.arrayBuffer()), mime: file.type })
    return NextResponse.json(result)
  } catch (e) {
    return fail(e)
  }
}
