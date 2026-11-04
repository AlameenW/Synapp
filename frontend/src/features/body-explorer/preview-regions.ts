import areas from '../../../../content/body-areas.json'
import type { BodyRegion } from '@/types/api'

// Shared catalog also drives search, display names, and front/back navigation.
export const bodyAreas = areas
export const regionGroups = [...new Set(areas.map(area => area.group))]
export const previewRegions: BodyRegion[] = areas.flatMap<BodyRegion>(area => area.paired
  ? (['left', 'right'] as const).map(side => ({
    id: `${side}_${area.id}`, name: `${side === 'left' ? 'Left' : 'Right'} ${area.name.toLowerCase()}`, side,
  }))
  : [{ id: area.id, name: area.name, side: 'midline' }],
)

export function isRearRegion(id: string) {
  return areas.some(area => area.id === id.replace(/^(left|right)_/, '') && area.back)
}

