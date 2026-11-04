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
  explorationTags?: string[]
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


export interface ChatTurn { role: 'user' | 'assistant'; text: string }
export interface ChatRequest { regionId: string; message: string; history?: ChatTurn[] }
/** mode: "ai" = Gemini wrote it, "library" = saved summary fallback, "safety" = warning-sign message (no AI call),
 *  "off_topic" = the question wasn't about health or the body, so Tendi politely declined. */
export interface ChatResponse {
  mode: 'ai' | 'library' | 'safety' | 'off_topic'
  aiEnabled: boolean
  regionId: string
  reply: string
  sourceIds: string[]
  notice?: string
}
export interface Readiness { status: string; aiEnabled: boolean; aiProvider?: string }

export interface ExplorationOption { id: string; label: string }
export interface ExplorationCondition { questionId: string; optionIds: string[] }
export interface ExplorationQuestion { id: string; prompt: string; multiple: boolean; options: ExplorationOption[]; when?: ExplorationCondition }
export interface ExplorationComparison { topicId: string; clues: ExplorationCondition[]; lessTypical: ExplorationCondition[] }
export interface ExplorationProfile { area: string; questions: ExplorationQuestion[]; comparisons: ExplorationComparison[] }
export interface ExplorationWarning { id: string; label: string; areas: string[]; level: 'urgent' | 'emergency'; action: string; sourceIds: string[] }
export interface ExplorationCatalog { version: number; warningSigns: ExplorationWarning[]; profiles: ExplorationProfile[] }
export interface ExplorationInput { regionId: string; warningStatus: 'none' | 'selected' | 'unsure'; warningSigns: string[]; answers: Record<string, string[]> }
export interface ExplorationResponse {
  regionId: string
  disposition: 'educational' | 'urgent' | 'emergency'
  summary: string
  nextStep: string
  reasons: string[]
  matches: { topic: Topic; matchedAnswers: string[]; lessTypicalAnswers: string[]; fit: 'closer' | 'possible' }[]
  sourceIds: string[]
  answerSummary: string[]
  limitations: string[]
}
