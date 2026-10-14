import topics from '../../../../content/topics.json'
import sources from '../../../../content/sources.json'
import type { Topic, HealthSource } from '@/types/api'

// Same version-controlled editorial content as the Swift API. No invented offline responses.
export const localTopics = topics as Topic[]
export const localSources = sources as HealthSource[]
export const areaNames: Record<string, string> = {
  shoulder: 'Shoulder', elbow: 'Elbow', wrist: 'Wrist', lower_back: 'Lower back', knee: 'Knee', ankle: 'Ankle',
}
export function regionArea(id: string) { return id.replace(/^(left|right)_/, '') }

