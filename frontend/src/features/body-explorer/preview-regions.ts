import type { BodyRegion } from '@/types/api'

// Local UI preview only. IDs must stay aligned with Swift BodyRegion.all.
export const previewRegions: BodyRegion[] = [
  'shoulder', 'elbow', 'wrist', 'knee', 'ankle',
].flatMap((region) =>
  (['left', 'right'] as const).map((side) => ({
    id: side + '_' + region,
    name: side[0].toUpperCase() + side.slice(1) + ' ' + region,
    side,
  })),
)
previewRegions.push({ id: 'lower_back', name: 'Lower back', side: 'midline' })

