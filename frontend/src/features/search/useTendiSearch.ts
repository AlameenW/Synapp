import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { SearchSuggestResponse } from '@/types/api'

type State = { status: 'idle' } | { status: 'loading' } | { status: 'done'; reply: SearchSuggestResponse } | { status: 'error'; message: string }

// Answers already fetched this session, so retyping or going back doesn't ask Gemini again.
const cache = new Map<string, SearchSuggestResponse>()

/** Tendi's part of the search page. Once the user pauses typing, the backend checks the search for warning signs
 *  (no AI). With `auto`, or after "Ask Tendi", it also asks Gemini for matching pages. */
export function useTendiSearch(query: string, auto: boolean) {
  const [requested, setRequested] = useState<string | null>(null)
  const [state, setState] = useState<State>({ status: 'idle' })
  const request = useRef<AbortController | null>(null)
  const key = query.trim().toLowerCase()
  const useAI = auto || requested === key
  const cacheKey = key + (useAI ? '|ai' : '|check')

  useEffect(() => {
    request.current?.abort()
    if (key.length < 3) { setState({ status: 'idle' }); return }
    const saved = cache.get(cacheKey)
    if (saved) { setState({ status: 'done', reply: saved }); return }
    const controller = new AbortController()
    request.current = controller
    // Only an AI request shows "Tendi is looking"; the quick warning-sign check happens quietly.
    setState(useAI ? { status: 'loading' } : { status: 'idle' })
    // Wait until the user pauses typing (asking by button starts right away).
    const timer = setTimeout(() => {
      api.suggest(query.trim(), useAI, controller.signal)
        .then(reply => { cache.set(cacheKey, reply); if (!controller.signal.aborted) setState({ status: 'done', reply }) })
        .catch((error: Error) => { if (!controller.signal.aborted) setState({ status: 'error', message: error.message }) })
    }, requested === key ? 0 : useAI ? 700 : 450)
    return () => { clearTimeout(timer); controller.abort() }
  }, [key, cacheKey, useAI, query, requested])

  return { query: query.trim(), key, useAI, state, requested: requested === key, ask: () => setRequested(key) }
}
export type TendiSearch = ReturnType<typeof useTendiSearch>
