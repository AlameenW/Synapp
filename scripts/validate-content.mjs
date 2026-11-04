import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const topics = read('content/topics.json')
const sources = read('content/sources.json')
const spec = read('docs/openapi.json')
const example = read('docs/guidance-example.json')
const areas = read('content/body-areas.json')
const exploration = read('content/exploration.json')
assert.equal(new Set(areas.map(area => area.id)).size, areas.length, 'Duplicate body area IDs')
const regions = new Set(areas.flatMap(area => area.paired ? ['left_' + area.id, 'right_' + area.id] : [area.id]))
const swiftRegions = readFileSync(resolve(root, 'backend/Sources/App/Models/BodyRegion.swift'), 'utf8')
for (const [name, paired] of [['pairedAreas', true], ['midlineAreas', false]]) {
  const declaration = swiftRegions.match(new RegExp('static let ' + name + ' = \\[([^\\]]+)\\]'))
  assert(declaration, 'Missing Swift region catalog: ' + name)
  const ids = [...declaration[1].matchAll(/"([a-z_]+)"/g)].map(match => match[1]).sort()
  assert.deepEqual(ids, areas.filter(area => area.paired === paired).map(area => area.id).sort(), 'Swift and frontend region IDs differ')
}

function validate(value, schema, path = 'value') {
  if (schema.$ref) return validate(value, spec.components.schemas[schema.$ref.split('/').at(-1)], path)
  if (schema.type === 'object') {
    assert(value && typeof value === 'object' && !Array.isArray(value), path + ' must be an object')
    for (const key of schema.required ?? []) assert(key in value, path + '.' + key + ' is required')
    for (const [key, child] of Object.entries(schema.properties)) {
      if (key in value) validate(value[key], child, path + '.' + key)
    }
  } else if (schema.type === 'array') {
    assert(Array.isArray(value), path + ' must be an array')
    value.forEach((item, index) => validate(item, schema.items, path + '[' + index + ']'))
  } else if (schema.type === 'integer') {
    assert(Number.isInteger(value), path + ' must be an integer')
    if (schema.minimum !== undefined) assert(value >= schema.minimum, path)
    if (schema.maximum !== undefined) assert(value <= schema.maximum, path)
  } else {
    assert.equal(typeof value, schema.type, path)
    if (schema.type === 'string') {
      if (schema.minLength) assert([...value.trim()].length >= schema.minLength, path)
      if (schema.maxLength) assert([...value].length <= schema.maxLength, path)
    }
  }
  if (schema.enum) assert(schema.enum.includes(value), path + ' has an unsupported value')
  if ('const' in schema) assert.equal(value, schema.const, path)
}

const sourceIDs = new Set(sources.map(source => source.id))
assert.equal(sourceIDs.size, sources.length, 'Duplicate source IDs')
assert.equal(new Set(topics.map(topic => topic.id)).size, topics.length, 'Duplicate topic IDs')
for (const source of sources) {
  validate(source, spec.components.schemas.HealthSource, source.id)
  assert.equal(new URL(source.url).protocol, 'https:')
  assert(/^\d{4}-\d{2}-\d{2}$/.test(source.accessedOn), 'Invalid access date')
}
const covered = new Set()
for (const topic of topics) {
  validate(topic, spec.components.schemas.Topic, topic.id)
  assert(topic.sourceIds.length > 0 && topic.symptoms.length > 0 && topic.whenToSeekHelp.length > 0)
  for (const source of topic.sourceIds) assert(sourceIDs.has(source), 'Unknown source ' + source)
  for (const region of topic.regionIds) {
    assert(regions.has(region), 'Unknown region ' + region)
    covered.add(region)
  }
}
assert.deepEqual(covered, regions, 'Some regions lack content')
assert.equal(exploration.version, 2)
assert.deepEqual(exploration.profiles.map(profile => profile.area).sort(), areas.map(area => area.id).sort(), 'Missing exploration profiles')
assert.equal(new Set(exploration.warningSigns.map(warning => warning.id)).size, exploration.warningSigns.length)
for (const warning of exploration.warningSigns) {
  assert(['urgent', 'emergency'].includes(warning.level))
  assert(warning.label && warning.action && warning.sourceIds.length)
  warning.sourceIds.forEach(id => assert(sourceIDs.has(id), 'Unknown warning source ' + id))
  warning.areas.forEach(id => assert(id === '*' || areas.some(area => area.id === id)))
}
for (const profile of exploration.profiles) {
  const questionIds = new Set(profile.questions.map(question => question.id))
  assert.equal(questionIds.size, profile.questions.length)
  assert(['duration', 'impact', 'onset', 'pattern', 'trend'].every(id => questionIds.has(id)))
  assert.equal(profile.questions[0].id, 'pattern')
  assert(profile.questions.some(question => question.when), 'No adaptive branches: ' + profile.area)
  const previous = new Map()
  for (const question of profile.questions) {
    assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length)
    assert(question.options.length >= 2 && question.options.every(option => option.label && option.id))
    assert.equal(question.multiple, question.id === 'pattern')
    if (question.when) {
      assert(question.when.optionIds.length && question.when.optionIds.every(id => previous.get(question.when.questionId)?.has(id)), 'Invalid or cyclic branch: ' + question.id)
    }
    previous.set(question.id, new Set(question.options.map(option => option.id)))
  }
  const patternIds = new Set(profile.questions.find(question => question.id === 'pattern').options.map(option => option.id))
  const relevant = topics.filter(topic => topic.regionIds.some(id => id === profile.area || id === 'left_' + profile.area || id === 'right_' + profile.area))
  assert(relevant.length >= 2, 'Each area needs multiple issue pages: ' + profile.area)
  assert(relevant.some(topic => (topic.explorationTags ?? []).some(tag => patternIds.has(tag))), 'No reading matches for ' + profile.area)
  assert(profile.comparisons.length && new Set(profile.comparisons.map(item => item.topicId)).size === profile.comparisons.length)
  for (const comparison of profile.comparisons) {
    assert(relevant.some(topic => topic.id === comparison.topicId), 'Comparison outside region: ' + comparison.topicId)
    assert(comparison.clues.length)
    for (const condition of [...comparison.clues, ...comparison.lessTypical]) {
      assert(condition.optionIds.length && condition.optionIds.every(id => !['other', 'unsure'].includes(id) && previous.get(condition.questionId)?.has(id)), 'Invalid comparison clue: ' + comparison.topicId)
    }
  }
}
for (const topic of topics) {
  const profileAreas = new Set(topic.regionIds.map(id => id.replace(/^(left|right)_/, '')))
  const ids = new Set(exploration.profiles.filter(profile => profileAreas.has(profile.area)).flatMap(profile => profile.questions.find(question => question.id === 'pattern').options.map(option => option.id)))
  for (const tag of topic.explorationTags ?? []) assert(tag !== 'other' && ids.has(tag), 'Unknown exploration tag ' + topic.id + ': ' + tag)
}
for (const id of ['nhs-chest', 'nhs-back', 'nhs-sprains', 'nhs-knee']) {
  assert(sourceIDs.has(id), 'Missing screening source ' + id)
}
function checkRefs(value) {
  if (!value || typeof value !== 'object') return
  if (value.$ref) assert(spec.components.schemas[value.$ref.split('/').at(-1)], 'Broken schema reference')
  Object.values(value).forEach(checkRefs)
}
checkRefs(spec)
validate(example, spec.components.schemas.GuidanceInput, 'guidance example')
assert(regions.has(example.regionId))
console.log('Validated ' + topics.length + ' topics, ' + sources.length + ' sources, ' + covered.size + ' regions, OpenAPI references and the guidance example.')
console.log('This checks data/contracts only; run swift test to verify the Swift implementation.')

