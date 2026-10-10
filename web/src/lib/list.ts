/** "Rafael or Marina" / "Rafael ou Marina", using first names. */
export function orList(names: string[], locale: 'en' | 'pt') {
  const first = names.map((n) => n.split(' ')[0])
  return new Intl.ListFormat(locale === 'pt' ? 'pt-BR' : 'en', { type: 'disjunction' }).format(first)
}
