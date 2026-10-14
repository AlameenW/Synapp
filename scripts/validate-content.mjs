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
const regions = new Set(['shoulder', 'elbow', 'wrist', 'knee', 'ankle'].flatMap(
  region => ['left_' + region, 'right_' + region],
).concat('lower_back'))

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

