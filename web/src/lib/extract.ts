import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

export const InvoiceFields = z.object({
  supplier_name: z.string(),
  supplier_country: z.string(),
  invoice_number: z.string(),
  total_amount: z.number(),
  currency: z.string(),
  due_date: z.string(),
})
export type ExtractedInvoice = z.infer<typeof InvoiceFields>

/** What public/sample-invoice.pdf contains. Returned in demo mode (no API key) so the flow stays usable. */
export const DEMO_INVOICE: ExtractedInvoice = {
  supplier_name: 'Shenzhen Tech Co.',
  supplier_country: 'CN',
  invoice_number: 'INV-2026-0845',
  total_amount: 80000,
  currency: 'USD',
  due_date: '2026-10-25',
}

export type ExtractionResult =
  | { source: 'ai'; data: ExtractedInvoice }
  | { source: 'demo'; data: ExtractedInvoice; reason: 'no_api_key' }

export class ExtractionError extends Error {}

export const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const
// The API accepts PDFs up to 32 MB per request; we stay well below that for a web upload.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['supplier_name', 'supplier_country', 'invoice_number', 'total_amount', 'currency', 'due_date'],
  properties: {
    supplier_name: { type: 'string', description: 'Legal or trade name of the party that issued the invoice (the seller).' },
    supplier_country: { type: 'string', description: 'ISO 3166-1 alpha-2 code of the seller country, or an empty string.' },
    invoice_number: { type: 'string', description: 'The invoice identifier exactly as printed.' },
    total_amount: { type: 'number', description: 'Grand total payable as a plain decimal number, no thousands separators.' },
    currency: { type: 'string', description: 'ISO 4217 code of the invoice currency, e.g. USD.' },
    due_date: { type: 'string', description: 'Payment due date as YYYY-MM-DD, or an empty string when not stated.' },
  },
} as const

const PROMPT =
  'Extract the fields from this commercial invoice. Use only what is printed in the document. ' +
  'If a field is not present, return an empty string (or 0 for the amount). Do not guess.'

export async function extractInvoice(file: { bytes: Buffer; mime: string }): Promise<ExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { source: 'demo', data: DEMO_INVOICE, reason: 'no_api_key' }

  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 })
  const data = file.bytes.toString('base64')
  const fileBlock: Anthropic.ContentBlockParam =
    file.mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : {
          type: 'image',
          source: { type: 'base64', media_type: file.mime as 'image/png' | 'image/jpeg' | 'image/webp', data },
        }

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5',
      max_tokens: 8000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: PROMPT }] }],
    })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ExtractionError('The AI service is busy. Fill the fields manually or try again.')
    if (e instanceof Anthropic.AuthenticationError) throw new ExtractionError('The Anthropic API key was rejected.')
    if (e instanceof Anthropic.BadRequestError) throw new ExtractionError('The AI service could not read this file.')
    if (e instanceof Anthropic.APIError) throw new ExtractionError(`AI service error (${e.status}).`)
    throw e
  }

  if (response.stop_reason === 'refusal') throw new ExtractionError('The AI service declined to read this file.')
  if (response.stop_reason === 'max_tokens') throw new ExtractionError('The AI response was cut off. Fill the fields manually.')

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text
  if (!text) throw new ExtractionError('The AI service returned no text.')
  const parsed = InvoiceFields.safeParse(JSON.parse(text))
  if (!parsed.success) throw new ExtractionError('The AI response did not match the expected fields.')
  return { source: 'ai', data: parsed.data }
}
