'use client'

import clsx from 'clsx'
import { Page, Upload } from 'iconoir-react'
import { useRef, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import type { Supplier } from '@/lib/demo/types'
import { Spinner } from '../../../ui'
import { Note } from '../../kit/Panel'
import { btnGo, btnLine, textLink } from '../../kit/styles'
import type { Extracted } from './draft'
import { SupplierChips } from './SupplierChips'

const ACCEPT = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export type ReadResult = { kind: 'ai' | 'demo'; data: Extracted; filename: string } | { kind: 'failed'; filename: string } | { kind: 'manual' }

/**
 * Step 1: the invoice goes in (file, the sample, a supplier to start from, or nothing and type it). Reading uses
 * /api/extract.
 */
export function InvoiceDrop({ suppliers, onRead, onSupplier }: { suppliers: Supplier[]; onRead: (r: ReadResult) => void; onSupplier: (id: string) => void }) {
  const { t } = useT()
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function read(file: File) {
    setError(null)
    if (!ACCEPT.includes(file.type)) return setError(t('wiz.upload.badType'))
    if (file.size > MAX_BYTES) return setError(t('wiz.upload.tooBig'))
    setReading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/extract', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onRead({ kind: json.source === 'ai' ? 'ai' : 'demo', data: json.data as Extracted, filename: file.name })
    } catch {
      onRead({ kind: 'failed', filename: file.name })
    } finally {
      setReading(false)
    }
  }

  async function sample() {
    const blob = await (await fetch('/sample-invoice.pdf')).blob()
    await read(new File([blob], 'sample-invoice.pdf', { type: 'application/pdf' }))
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) void read(f)
        }}
        className={clsx(
          'grid place-items-center gap-4 border border-dashed px-6 py-12 text-center transition-colors',
          dragging ? 'border-brand-600 bg-brand-50' : 'border-ink/25 bg-paper-hi',
        )}
      >
        {reading ? (
          <>
            <Spinner className="h-7 w-7 text-ink" />
            <p className="text-[15px] font-medium">{t('wiz.upload.reading')}</p>
          </>
        ) : (
          <>
            <Page width={30} height={30} strokeWidth={1.5} className="text-ink/60" aria-hidden="true" />
            <div>
              <p className="font-grotesk text-[20px] tracking-[-0.02em]">{t('app.np.drop')}</p>
              <p className="mx-auto mt-1 max-w-sm text-[14px] leading-relaxed text-muted">{t('wiz.upload.hint')}</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              aria-label={t('wiz.upload.select')}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void read(f)
                e.target.value = ''
              }}
            />
            <div className="flex flex-wrap justify-center gap-2.5">
              <button type="button" className={btnGo} onClick={() => fileRef.current?.click()}>
                <Upload width={15} height={15} strokeWidth={1.5} aria-hidden="true" />
                {t('wiz.upload.select')}
              </button>
              <button type="button" className={btnLine} onClick={() => void sample()}>
                {t('wiz.upload.sample')}
              </button>
            </div>
            <p className="text-[12.5px] text-muted">{t('wiz.upload.sampleNote')}</p>
          </>
        )}
      </div>
      {error ? <Note tone="bad">{error}</Note> : null}
      <SupplierChips suppliers={suppliers} onPick={onSupplier} />
      <button type="button" className={clsx(textLink, 'text-[14px]')} onClick={() => onRead({ kind: 'manual' })}>
        {t('app.np.manual')}
      </button>
    </div>
  )
}
