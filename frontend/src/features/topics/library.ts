import topics from '../../../../content/topics.json'
import sources from '../../../../content/sources.json'
import type { Topic, HealthSource } from '@/types/api'
import { bodyAreas } from '@/features/body-explorer/preview-regions'

// Same version-controlled editorial content as the Swift API. No invented offline responses.
export const localTopics = topics as Topic[]
export const localSources = sources as HealthSource[]
export const areaNames: Record<string, string> = Object.fromEntries(bodyAreas.map(area => [area.id, area.name]))
export function regionArea(id: string) { return id.replace(/^(left|right)_/, '') }

