export type BodyView = 'surface' | 'muscles'
export type Point = [number, number, number]
export interface Landmark { id: string; position: Point; radius: number }

// Assets are normalized to 3.3 units high, feet at -1.7. Different source
// poses require separate landmarks; these are approximate selection areas.
const surface = [
  ['shoulder', [.363, .963, -.021], .30],
  ['elbow', [.69, .579, .032], .23],
  ['wrist', [.915, .355, .279], .22],
  ['knee', [.28, -.75, .039], .30],
  ['ankle', [.353, -1.552, -.008], .23],
] as const
const muscles = [
  ['shoulder', [.38, .91, .06], .31],
  ['elbow', [.49, .43, .04], .25],
  ['wrist', [.59, -.17, .06], .23],
  ['knee', [.17, -.78, .15], .28],
  ['ankle', [.15, -1.48, .07], .23],
] as const

export function landmarksFor(view: BodyView): Landmark[] {
  const landmarks: Landmark[] = (view === 'surface' ? surface : muscles).flatMap(([region, position, radius]) =>
    ([-1, 1] as const).map(side => ({
      id: `${side === 1 ? 'left' : 'right'}_${region}`,
      position: [position[0] * side, position[1], position[2]], radius,
    })),
  )
  landmarks.push({ id: 'lower_back', position: view === 'surface' ? [0, .374, -.306] : [0, .35, -.21], radius: .30 })
  return landmarks
}

// Local coordinates keep anatomical left/right correct when the body rotates.
// Unsupported locations return null instead of selecting an unrelated region.
export function regionAtPoint(point: Point, landmarks: Landmark[]): string | null {
  let nearest: string | null = null
  let distance = Infinity
  for (const landmark of landmarks) {
    const current = Math.hypot(...point.map((value, i) => value - landmark.position[i]))
    if (current <= landmark.radius && current < distance) {
      nearest = landmark.id
      distance = current
    }
  }
  return nearest
}
