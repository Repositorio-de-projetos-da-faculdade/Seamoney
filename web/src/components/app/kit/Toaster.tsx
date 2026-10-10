'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useT } from '@/lib/i18n/client'

type Tone = 'ok' | 'bad'
interface Toast {
  id: number
  tone: Tone
  text: string
}

const ToastContext = createContext<{ ok: (text: string) => void; bad: (text: string) => void } | null>(null)

let counter = 0

/** Short confirmations after an action ("INV-… approved"). Announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT()
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = ++counter
      setToasts((list) => [...list.slice(-2), { id, tone, text }])
      setTimeout(() => dismiss(id), tone === 'bad' ? 7_000 : 4_500)
    },
    [dismiss],
  )
  const api = useMemo(() => ({ ok: (text: string) => push('ok', text), bad: (text: string) => push('bad', text) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-8"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'bad' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md animate-rise items-start gap-3 border-l-[3px] bg-night px-4 py-3.5 font-text text-[14px] text-foam shadow-[0_30px_60px_-24px_rgb(2_8_16/0.7)] ${toast.tone === 'ok' ? 'border-mint' : 'border-[#ff7a6e]'}`}
          >
            {toast.tone === 'ok' ? (
              <CircleCheck size={18} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
            ) : (
              <CircleAlert size={18} className="mt-0.5 shrink-0 text-[#fca5a5]" aria-hidden="true" />
            )}
            <p className="min-w-0 flex-1 leading-relaxed">{toast.text}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label={t('app.close')}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast needs ToastProvider')
  return ctx
}
