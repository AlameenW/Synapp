import type { ExplorationQuestion } from '../../types/api.ts'

export function activeQuestions(questions: ExplorationQuestion[], answers: Record<string, string[]>) {
  const active: ExplorationQuestion[] = []
  for (const question of questions) {
    const condition = question.when
    if (!condition || (active.some(item => item.id === condition.questionId)
      && (answers[condition.questionId] ?? []).some(id => condition.optionIds.includes(id)))) active.push(question)
  }
  return active
}

export function pruneAnswers(questions: ExplorationQuestion[], answers: Record<string, string[]>) {
  const ids = new Set(activeQuestions(questions, answers).map(question => question.id))
  return Object.fromEntries(Object.entries(answers).filter(([id]) => ids.has(id)))
}
