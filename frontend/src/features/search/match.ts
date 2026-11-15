// Word-by-word matching for the body search. "finger bend", "bent fingers" and "fingers locking" all find the hand,
// because each word is matched on its own and word endings are ignored.

// Words that say nothing about where or what: matched on their own they would hit almost every page.
const ignored = new Set([
  'a', 'an', 'and', 'the', 'my', 'me', 'i', 'im', 'it', 'its', 'is', 'am', 'are', 'was', 'be', 'to', 'of', 'in', 'on', 'at',
  'for', 'from', 'with', 'when', 'after', 'during', 'while', 'or', 'but', 'so', 'this', 'that', 'can', 'cant', 'do', 'dont',
  'does', 'feel', 'feels', 'feeling', 'get', 'gets', 'have', 'has', 'just', 'really', 'very', 'bit', 'little', 'lot',
  'pain', 'painful', 'pains', 'hurt', 'hurts', 'hurting', 'ache', 'aches', 'aching', 'achy', 'sore', 'soreness',
  'left', 'right', 'side', 'both', 'won', 't', 'wont', 'not', 'no', 'why', 'what', 'how', 'should',
])

// Irregular forms that suffix stripping can't reach.
const irregular: Record<string, string> = { bent: 'bend', feet: 'foot', calves: 'calf', teeth: 'tooth', ran: 'run', fell: 'fall', fallen: 'fall' }

/** A rough stem: "bending" -> "bend", "fingers" -> "finger", "locked" -> "lock". Applied to both sides, so it only has to be consistent. */
export function stem(word: string): string {
  if (irregular[word]) return irregular[word]
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (word.length > suffix.length + 3 && word.endsWith(suffix)) return word.slice(0, -suffix.length)
  }
  return word
}

/** The meaningful words in some text, stemmed. */
export function terms(text: string): string[] {
  const words = text.toLowerCase().replace(/[’']/g, '').split(/[^a-z]+/)
  return [...new Set(words.filter(word => word.length >= 2 && !ignored.has(word)).map(stem))]
}

export interface AreaMatch {
  /** How many of the search terms this area matches (in its names, or in its topics' text). */
  matched: number
  /** Out of how many meaningful search terms. */
  total: number
  /** The topic text that contains the most search terms, to show as "Matches …". Null when the area's name matched. */
  match: string | null
}

/** Matches search terms against one body area: its names (left/right, aliases) and its topics' titles, symptoms and overviews. */
export function matchArea(query: string, names: string[], topicTexts: string[]): AreaMatch | null {
  const phrase = query.trim().toLowerCase()
  if (!phrase) return null
  // The whole phrase inside a name or text is the strongest match, and keeps searches like "pain" working.
  if (names.some(name => name.toLowerCase().includes(phrase))) return { matched: 1, total: 1, match: null }
  const exact = topicTexts.find(text => text.toLowerCase().includes(phrase))
  const wanted = terms(phrase)
  if (!wanted.length) return exact ? { matched: 1, total: 1, match: exact } : null

  const nameTerms = new Set(names.flatMap(terms))
  let best: { text: string; hits: number } | null = null
  for (const text of topicTexts) {
    const textTerms = new Set(terms(text))
    const hits = wanted.filter(term => textTerms.has(term)).length
    if (hits && (!best || hits > best.hits)) best = { text, hits }
  }
  const covered = wanted.filter(term => nameTerms.has(term) || topicTexts.some(text => terms(text).includes(term))).length
  if (!covered) return exact ? { matched: 1, total: 1, match: exact } : null
  const nameHit = wanted.some(term => nameTerms.has(term))
  return { matched: covered, total: wanted.length, match: exact ?? (nameHit && (!best || best.hits < 2) ? null : best?.text ?? null) }
}
