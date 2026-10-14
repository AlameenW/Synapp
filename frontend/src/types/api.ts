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
  symptoms: string[]
  commonness: string
  generalCare: string[]
  whenToSeekHelp: string[]
  sourceIds: string[]
  contentStatus: 'editorial_draft' | 'clinically_reviewed'
}

export interface GuidanceInput {
  regionId: string
  description: string
  activity?: string
  onset?: string
  durationDays?: number
  painIntensity?: number
  screening?: SafetyScreening
}

export type ScreeningAnswer = 'yes' | 'no' | 'unsure'

export interface SafetyScreening {
  chestPain: ScreeningAnswer
  seriousAccident: ScreeningAnswer
  backNeurologicalSymptoms: ScreeningAnswer
  lossOfSensation: ScreeningAnswer
  unableToUseLimb: ScreeningAnswer
  feverWithHotSwollenJoint: ScreeningAnswer
  deformity: ScreeningAnswer
  suddenSeverePain: ScreeningAnswer
}

export interface HealthSource {
  id: string
  title: string
  publisher: string
  url: string
  accessedOn: string
}

export interface GuidanceResponse {
  mode: 'educational'
  aiEnabled: false
  regionId: string
  summary: string
  disposition: 'emergency' | 'urgent' | 'needs_more_information' | 'not_assessed'
  reasons: string[]
  topics: Topic[]
  generalCare: string[]
  whenToSeekHelp: string[]
  followUpQuestions: string[]
  sourceIds: string[]
  limitations: string[]
}

