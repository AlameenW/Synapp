export type BodyView = 'surface' | 'muscles'
export type Point = [number, number, number]
export interface Landmark { id: string; position: Point; radius: number; rear: boolean }

// Normalized height 3.3, feet at -1.7; anatomical left is positive X.
// The two assets have independent poses. Front/back locations have separate
// depths sampled from the bundled meshes, so front/back surfaces stay distinct.
type Placement = readonly [string, readonly [number, number, number], number, boolean?]
const surface: readonly Placement[] = [
  ['shoulder', [.363, .963, -0.1257], .25],
  ['upper_arm', [.53, .77, -0.1320], .19],
  ['elbow', [.69, .579, -0.0903], .16],
  ['forearm', [.80, .46, 0.0253], .16],
  ['wrist', [.915, .355, 0.2089], .14],
  ['hand', [1.015, .18, 0.3598], .19],
  ['chest', [.19, .86, -0.0170], .22],
  ['hip', [.31, -.04, -0.0318], .22],
  ['glute', [.19, -.16, -0.3920], .22, true],
  ['thigh', [.255, -.42, 0.0313], .24],
  ['hamstring', [.255, -.42, -0.3787], .23, true],
  ['knee', [.28, -.75, -0.0953], .23],
  ['shin', [.31, -1.13, -0.1619], .23],
  ['calf', [.31, -1.13, -0.3715], .23, true],
  ['ankle', [.353, -1.50, -0.1485], .14],
  ['foot', [.35, -1.635, 0.0393], .17],
]
const muscles: readonly Placement[] = [
  ['shoulder', [.38, .91, 0.0162], .25],
  ['upper_arm', [.37, .68, 0.0071], .19],
  ['elbow', [.44, .40, -0.0358], .18],
  ['forearm', [.48, .17, 0.0336], .18],
  ['wrist', [.52, -.03, 0.0423], .12],
  ['hand', [.54, -.20, 0.0721], .16],
  ['chest', [.16, .83, 0.2027], .20],
  ['hip', [.25, -.08, 0.0659], .21],
  ['glute', [.15, -.17, -0.1734], .20, true],
  ['thigh', [.18, -.43, 0.0993], .22],
  ['hamstring', [.18, -.43, -0.1415], .20, true],
  ['knee', [.17, -.78, 0.0298], .22],
  ['shin', [.16, -1.12, -0.0130], .22],
  ['calf', [.16, -1.12, -0.1978], .21, true],
  ['ankle', [.15, -1.47, -0.0479], .13],
  ['foot', [.15, -1.62, 0.0901], .17],
]
const midline: Record<BodyView, readonly Placement[]> = {
  surface: [
    ['head', [0, 1.40, 0.0192], .23],
    ['neck', [0, 1.13, -0.0960], .14],
    ['abdomen', [0, .42, 0.0133], .28],
    ['upper_back', [0, .84, -0.4310], .30, true],
    ['lower_back', [0, .374, -0.3467], .28, true],
  ],
  muscles: [
    ['head', [0, 1.40, 0.1607], .23],
    ['neck', [0, 1.12, 0.0634], .14],
    ['abdomen', [0, .40, 0.1972], .27],
    ['upper_back', [0, .83, -0.1911], .28, true],
    ['lower_back', [0, .35, -0.1440], .27, true],
  ],
}

export function landmarksFor(view: BodyView): Landmark[] {
  return [
    ...(view === 'surface' ? surface : muscles).flatMap(([region, position, radius, rear = false]) =>
      ([-1, 1] as const).map(side => ({
        id: `${side === 1 ? 'left' : 'right'}_${region}`,
        position: [position[0] * side, position[1], position[2]] as Point, radius, rear,
      })),
    ),
    ...midline[view].map(([id, position, radius, rear = false]) => ({ id, position: [...position] as Point, radius, rear })),
  ]
}

// Local coordinates preserve anatomical sides when rotating. Radius bounds
// keep empty space from selecting an unrelated region.
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
