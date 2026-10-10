'use client'

import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { roleCan } from '@/lib/demo/rules'
import { supplierOf } from '@/lib/demo/selectors'
import { useDemoState, useMe } from '@/lib/demo/store'
import type { DemoState, Network, Payment } from '@/lib/demo/types'
import { Empty, Panel } from '../../kit/Panel'
import { Segments } from '../../kit/Segments'
import { btnGo, fieldInput } from '../../kit/styles'
import { Page } from '../../shell/DeskShell'
import { PaymentCards } from './PaymentCards'
import { PaymentTable } from './PaymentTable'
import { defaultSort, nextSort, sortPayments, type Sort, type SortKey } from './sort'
import { ViewSummary } from './ViewSummary'
import { inView, isView, VIEWS, type View } from './views'

function matches(state: DemoState, p: Payment, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  const s = supplierOf(state, p)
  return [p.invoiceNumber, p.reference, s?.name, s?.city, s?.port].some((x) => x?.toLowerCase().includes(q))
}

type NetworkFilter = 'all' | Network

/**
 * All payment orders, as queues by whose turn it is. Above the table the view in numbers; in the table what is late or
 * due soon stands out, and the amount and due columns sort.
 */
export function PaymentsList() {
  const { t } = useT()
  const state = useDemoState()
  const me = useMe()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [network, setNetwork] = useState<NetworkFilter>('all')
  const [chosenSort, setSort] = useState<Sort | null>(null)
  const [now] = useState(() => Date.now())
  if (!state || !me) return null

  const searched = state.payments.filter((p) => matches(state, p, query.trim()) && (network === 'all' || p.network === network))
  const count = (v: View) => searched.filter((p) => inView(state, me, p, v)).length
  const asked = params.get('view')
  // without a view in the address: start where your work is, or everything when nothing waits for you
  const view: View = isView(asked) ? asked : count('mine') > 0 ? 'mine' : 'all'
  const sort = chosenSort ?? defaultSort(view !== 'all')
  const shown = sortPayments(
    searched.filter((p) => inView(state, me, p, view)),
    sort,
  )
  const setView = (v: View) => {
    setSort(null)
    router.replace(`${pathname}?view=${v}`, { scroll: false })
  }
  const onSort = (k: SortKey) => setSort(nextSort(sort, k))
  const tabs: View[] = (VIEWS as readonly View[]).includes(view) ? [...VIEWS] : [...VIEWS, view]

  return (
    <Page
      title={t('app.pay.title')}
      lede={t('app.pay.lede')}
      actions={
        roleCan(me.role, 'create_payment') ? (
          <Link href="/app/payments/new" className={btnGo}>
            <Plus size={16} aria-hidden="true" />
            {t('app.nav.new')}
          </Link>
        ) : null
      }
    >
      <div className="mb-5">
        <Segments
          label={t('app.pay.views')}
          value={view}
          onChange={setView}
          options={tabs.map((v) => ({ value: v, label: t(`app.pay.view.${v}`), count: count(v), urgent: v === 'mine' || v === 'review' }))}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-[13.5px] text-muted">{t(`app.pay.view.${view}.about`)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={t('app.plist.network')} className="flex h-10 items-center rounded-full border border-rule bg-white p-1 text-[13px]">
            {(['all', 'tempo', 'solana'] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={network === n}
                onClick={() => setNetwork(n)}
                className={network === n ? 'h-8 rounded-full bg-ink px-3 font-medium text-white' : 'h-8 rounded-full px-3 text-muted hover:text-ink'}
              >
                {n === 'all' ? t('app.plist.allNetworks') : t(`app.net.${n}`)}
              </button>
            ))}
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">{t('app.search')}</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input type="search" className={`${fieldInput} pl-9`} placeholder={t('app.pay.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
      </div>

      {shown.length > 0 ? <ViewSummary payments={shown} now={now} /> : null}

      <Panel>
        {shown.length === 0 ? (
          <Empty title={query || network !== 'all' ? t('app.pay.noMatch') : t(`app.pay.view.${view}.empty`)}>{query ? null : t('app.pay.emptyHint')}</Empty>
        ) : (
          <>
            <div className="md:hidden">
              <PaymentCards state={state} me={me} payments={shown} now={now} />
            </div>
            <div className="relative hidden overflow-x-auto md:block">
              <PaymentTable state={state} me={me} payments={shown} now={now} sort={sort} onSort={onSort} showAction={view === 'mine'} />
            </div>
          </>
        )}
      </Panel>
    </Page>
  )
}
