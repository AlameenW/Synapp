import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { activeQuestions, pruneAnswers } from '../src/features/topics/exploration-flow.ts'

const catalog = JSON.parse(readFileSync(new URL('../../content/exploration.json', import.meta.url)))
const profile = area => catalog.profiles.find(item => item.area === area)

test('knee paths ask different follow-ups for kneecap pain and twisting', () => {
  const questions = profile('knee').questions
  const front = activeQuestions(questions, { pattern: ['front_knee_load'] }).map(q => q.id)
  const twist = activeQuestions(questions, { pattern: ['knee_twist'] }).map(q => q.id)
  assert.ok(front.includes('knee_stairs') && !front.includes('knee_catch'))
  assert.ok(twist.includes('knee_catch') && !twist.includes('knee_stairs'))
})

test('editing an ancestor removes stale answers, including nested branches', () => {
  const questions = profile('shoulder').questions
  const answers = { pattern: ['restricted_shoulder'], shoulder_stiff: ['yes'], shoulder_slow: ['yes'], duration: ['days'] }
  assert.ok(activeQuestions(questions, answers).some(q => q.id === 'shoulder_slow'))
  const changed = pruneAnswers(questions, { ...answers, shoulder_stiff: ['no'] })
  assert.equal(changed.shoulder_slow, undefined)
  const replaced = pruneAnswers(questions, { ...answers, pattern: ['other'] })
  assert.equal(replaced.shoulder_stiff, undefined)
  assert.equal(replaced.shoulder_slow, undefined)
  assert.deepEqual(replaced.duration, ['days'])
})

test('all 21 areas have distinct reachable branches and uncertainty remains neutral', () => {
  for (const { area, questions } of catalog.profiles) {
    assert.equal(activeQuestions(questions, { pattern: ['other'] }).length, 5, area)
    for (const option of questions[0].options.filter(o => o.id !== 'other')) {
      const selected = { pattern: [option.id] }
      const path = activeQuestions(questions, selected)
      assert.ok(path.some(q => q.when), area + ': ' + option.id)
      const unknown = Object.fromEntries(path.map(q => [q.id, q.id === 'pattern' ? [option.id] : ['unsure']]))
      assert.ok(activeQuestions(questions, unknown).length >= 5)
    }
  }
})
