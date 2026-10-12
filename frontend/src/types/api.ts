export interface BodyRegion {
  id: string
  name: string
  side: 'left' | 'right' | 'midline'
}

export interface Topic {
  id: string
  regionIds: string[]
  title: string
  overview: string
  sourceIds: string[]
}

export interface GuidanceInput {
  regionId: string
  description: string
}

