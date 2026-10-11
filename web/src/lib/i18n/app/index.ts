// Copy of the SaaS demo (/app), one file per area. Each file types its Portuguese half against its English half,
// so a missing translation is a compile error in that file.
import * as login from './login'
import * as overview from './overview'
import * as payDoc from './payDoc'
import * as payList from './payList'
import * as payNew from './payNew'
import * as payments from './payments'
import * as proof from './proof'
import * as reports from './reports'
import * as settings from './settings'
import * as shell from './shell'
import * as supDoc from './supDoc'
import * as supList from './supList'
import * as suppliers from './suppliers'
import * as team from './team'

export const appEn = {
  ...shell.en,
  ...overview.en,
  ...payments.en,
  ...proof.en,
  ...suppliers.en,
  ...reports.en,
  ...team.en,
  ...settings.en,
  ...payList.en,
  ...payDoc.en,
  ...payNew.en,
  ...supList.en,
  ...supDoc.en,
  ...login.en,
}

export const appPt: Record<keyof typeof appEn, string> = {
  ...shell.pt,
  ...overview.pt,
  ...payments.pt,
  ...proof.pt,
  ...suppliers.pt,
  ...reports.pt,
  ...team.pt,
  ...settings.pt,
  ...payList.pt,
  ...payDoc.pt,
  ...payNew.pt,
  ...supList.pt,
  ...supDoc.pt,
  ...login.pt,
}
