import type { Locale } from '@/lib/i18n/dict'

// The legal pages (/terms, /privacy) are long documents, so their text lives here, one file per document and both
// languages side by side, instead of in dict.ts. Shared by the Next app and the static build (landing-static/).

/** A paragraph, or a bulleted list. */
export type LegalBlock = string | { list: string[] }

export interface LegalSection {
  id: string
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDoc {
  title: string
  intro: string
  sections: LegalSection[]
}

export type LegalKind = 'terms' | 'privacy'

export type LegalDocs = Record<Locale, LegalDoc>

/** When both documents were last changed (ISO date); shown at the top of each page. */
export const LEGAL_UPDATED = '2026-10-12'

export const LEGAL_PATH: Record<LegalKind, string> = { terms: '/terms', privacy: '/privacy' }
