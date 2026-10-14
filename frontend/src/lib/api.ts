import type { BodyRegion, Topic, HealthSource } from '@/types/api'

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api' + path, { signal })
  if (!response.ok) throw new Error('The library is temporarily unavailable.')
  return response.json() as Promise<T>
}
export const api = {
  regions: (signal?: AbortSignal) => get<BodyRegion[]>('/regions', signal),
  topics: (regionId: string, signal?: AbortSignal) =>
    get<Topic[]>('/regions/' + encodeURIComponent(regionId) + '/topics', signal),
  sources: (signal?: AbortSignal) => get<HealthSource[]>('/sources', signal),
}

