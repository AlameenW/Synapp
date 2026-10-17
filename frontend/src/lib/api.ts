import type { BodyRegion, Topic, HealthSource, ChatRequest, ChatResponse, Readiness } from '@/types/api'

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api' + path, { signal })
  if (!response.ok) throw new Error('The library is temporarily unavailable.')
  return response.json() as Promise<T>
}
async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  })
  if (!response.ok) {
    // The backend sends {reason} for errors such as rate limiting; show it when available.
    const reason = await response.json().then((data: { reason?: string }) => data.reason).catch(() => undefined)
    throw new Error(reason ?? 'Tendi is temporarily unavailable.')
  }
  return response.json() as Promise<T>
}
export const api = {
  regions: (signal?: AbortSignal) => get<BodyRegion[]>('/regions', signal),
  topics: (regionId: string, signal?: AbortSignal) =>
    get<Topic[]>('/regions/' + encodeURIComponent(regionId) + '/topics', signal),
  sources: (signal?: AbortSignal) => get<HealthSource[]>('/sources', signal),
  ready: (signal?: AbortSignal) => get<Readiness>('/ready', signal),
  chat: (body: ChatRequest, signal?: AbortSignal) => post<ChatResponse>('/chat', body, signal),
}

