// Client-side article search shared by the home page and the Ctrl+K palette.
// The corpus is small (a few hundred articles), so a weighted token scorer beats a generic index:
// accent-insensitive, ignores Spanish stopwords, ranks by where a word matched, tolerates one typo.

export interface SearchDoc {
  slug: string
  category: string
  title: string
  description: string
  keywords: string[]
  tags: string[]
  headings: string[]
}

export interface SearchHit<T extends SearchDoc> {
  doc: T
  score: number
  matched: number   // query words found in the doc
}

export interface SearchResult<T extends SearchDoc> {
  hits: SearchHit<T>[]
  partial: boolean  // no doc matched every word: showing best partial matches
}

const STOPWORDS = new Set([
  'a', 'al', 'como', 'con', 'de', 'del', 'el', 'en', 'es', 'esta', 'este', 'la', 'las', 'lo', 'los',
  'mi', 'para', 'por', 'que', 'se', 'si', 'sin', 'su', 'un', 'una', 'uno', 'y', 'o', 'the', 'to', 'of', 'in', 'how',
])

// Where a word matched decides how much it counts
const FIELD_WEIGHTS = { title: 10, keywords: 8, tags: 6, headings: 4, description: 3, category: 3 } as const
type Field = keyof typeof FIELD_WEIGHTS
const PREFIX_FACTOR = 0.6
const TYPO_FACTOR = 0.5

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function tokenize(text: string): string[] {
  return normalize(text).split(/[^a-z0-9._-]+/).flatMap(t => {
    const trimmed = t.replace(/^[._-]+|[._-]+$/g, '')
    // "agent.jar", "ssh-keygen": keep the compound and its parts
    const parts = trimmed.split(/[._-]+/).filter(Boolean)
    return parts.length > 1 ? [trimmed, ...parts] : parts
  })
}

export function queryWords(query: string): string[] {
  const words = tokenize(query).filter(w => w.length >= 2 && !STOPWORDS.has(w))
  return [...new Set(words)]
}

interface Indexed<T extends SearchDoc> {
  doc: T
  fields: Record<Field, Set<string>>
  titleLead: string  // first title token: "Terragrunt: ..." is *about* terragrunt
  phrase: string  // normalized title + keywords, for whole-query bonus
}

export interface SearchIndex<T extends SearchDoc> {
  docs: Indexed<T>[]
  vocabulary: string[]
}

export function buildIndex<T extends SearchDoc>(docs: T[]): SearchIndex<T> {
  const vocab = new Set<string>()
  const indexed = docs.map(doc => {
    const fields = {
      title: new Set(tokenize(doc.title)),
      keywords: new Set(tokenize(doc.keywords.join(' '))),
      tags: new Set(tokenize(doc.tags.join(' '))),
      headings: new Set(tokenize(doc.headings.join(' '))),
      description: new Set(tokenize(doc.description)),
      category: new Set(tokenize(doc.category)),
    }
    Object.values(fields).forEach(set => set.forEach(t => vocab.add(t)))
    return {
      doc,
      fields,
      titleLead: tokenize(doc.title)[0] ?? '',
      phrase: normalize(`${doc.title} | ${doc.keywords.join(' | ')}`),
    }
  })
  return { docs: indexed, vocabulary: [...vocab] }
}

// Damerau-free Levenshtein capped at 1: true when a and b differ by one edit
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

// Best field weight for the word, plus a small bonus per extra field it appears in:
// an article *about* a topic names it in title, keywords, tags and headings, not just once
function scoreWord(word: string, fields: Indexed<SearchDoc>['fields'], typoFixes: string[]): number {
  let best = 0
  let exactFields = 0
  for (const field of Object.keys(FIELD_WEIGHTS) as Field[]) {
    const weight = FIELD_WEIGHTS[field]
    const tokens = fields[field]
    if (tokens.has(word)) { best = Math.max(best, weight); exactFields++; continue }
    if (best >= weight * PREFIX_FACTOR) continue
    for (const t of tokens) {
      if (t.startsWith(word)) { best = Math.max(best, weight * PREFIX_FACTOR); break }
    }
    for (const fix of typoFixes) {
      if (tokens.has(fix)) best = Math.max(best, weight * TYPO_FACTOR)
    }
  }
  return best + Math.max(0, exactFields - 1) * 1.5
}

export function search<T extends SearchDoc>(index: SearchIndex<T>, query: string, limit = 50): SearchResult<T> {
  const words = queryWords(query)
  if (words.length === 0) return { hits: [], partial: false }

  // Typo tolerance only for words that match nothing as-is or as a prefix
  const typoFixes = new Map<string, string[]>()
  for (const w of words) {
    const known = index.vocabulary.some(t => t.startsWith(w))
    typoFixes.set(w, known || w.length < 5 ? [] : index.vocabulary.filter(t => withinOneEdit(w, t)))
  }

  const phrase = normalize(query.trim())
  const hits: SearchHit<T>[] = []
  for (const entry of index.docs) {
    let score = 0, matched = 0
    for (const w of words) {
      const s = scoreWord(w, entry.fields, typoFixes.get(w)!)
      if (s > 0) { score += s + (entry.titleLead === w ? 4 : 0); matched++ }
    }
    if (matched === 0) continue
    if (words.length > 1 && entry.phrase.includes(phrase)) score += 15
    hits.push({ doc: entry.doc, score, matched })
  }

  const complete = hits.filter(h => h.matched === words.length)
  const pool = complete.length > 0 ? complete : hits
  pool.sort((a, b) => b.matched - a.matched || b.score - a.score || a.doc.title.localeCompare(b.doc.title))
  return { hits: pool.slice(0, limit), partial: complete.length === 0 }
}
