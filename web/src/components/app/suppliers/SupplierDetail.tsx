'use client'

import Link from 'next/link'
import { useDemoState, useMe } from '@/lib/demo/store'
import { supplierById } from '@/lib/demo/selectors'
import { useT } from '@/lib/i18n/client'
import { Empty, Panel } from '../kit/Panel'
import { btnLine, textLink } from '../kit/styles'
import { Page } from '../shell/DeskShell'
import { countryName } from './helpers'
import { DetailActions } from './DetailActions'
import { FiguresStrip } from './FiguresStrip'
import { LocalTime } from './LocalTime'
import { RoutePanel } from './RoutePanel'
import { SupplierPayments } from './SupplierPayments'
import { ActivityPanel, ProfilePanel } from './SupplierSide'
import { WalletsPanel } from './WalletsPanel'
import { zoneFor } from './detailFormat'

export function SupplierDetail({ id }: { id: string }) {
  const { t, locale } = useT()
  const state = useDemoState()
  const me = useMe()
  if (!state || !me) return null

  const supplier = supplierById(state, id)
  const back = (
    <Link href="/app/suppliers" className={textLink}>
      {t('app.sup.title')}
    </Link>
  )

  if (!supplier) {
    return (
      <Page title={t('app.sup.nf.title')} crumb={back}>
        <Panel>
          <Empty
            title={t('app.sup.nf.title')}
            action={
              <Link href="/app/suppliers" className={btnLine}>
                {t('app.sup.back')}
              </Link>
            }
          >
            {t('app.sup.nf.body')}
          </Empty>
        </Panel>
      </Page>
    )
  }

  const where = [supplier.city, countryName(supplier.country, locale)].filter(Boolean).join(', ')
  const lede = supplier.port ? `${where}, ${t('app.sup.lede.port', { port: supplier.port })}` : where

  return (
    <Page
      title={supplier.name}
      lede={
        <>
          {lede}
          <span className="mt-1 block">
            <LocalTime zone={zoneFor(supplier.country)} />
          </span>
        </>
      }
      actions={<DetailActions me={me} supplier={supplier} />}
      crumb={back}
    >
      <div className="space-y-6">
        <FiguresStrip state={state} supplier={supplier} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <WalletsPanel state={state} me={me} supplier={supplier} />
            <SupplierPayments state={state} supplier={supplier} />
          </div>
          <div className="min-w-0 space-y-6">
            <RoutePanel state={state} supplier={supplier} />
            <ActivityPanel state={state} supplier={supplier} />
          </div>
        </div>
        <ProfilePanel supplier={supplier} />
      </div>
    </Page>
  )
}
