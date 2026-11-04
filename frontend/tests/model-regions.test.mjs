import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { landmarksFor, regionAtPoint } from '../src/features/body-explorer/model-regions.ts'

const areas = JSON.parse(readFileSync(new URL('../../content/body-areas.json', import.meta.url)))
const ids = areas.flatMap(area => area.paired ? ['left_' + area.id, 'right_' + area.id] : [area.id])

for (const view of ['surface', 'muscles']) {
  test(`${view}: every catalog area has a selectable landmark and resolves correctly`, () => {
    const landmarks = landmarksFor(view)
    assert.equal(landmarks.length, 37)
    assert.deepEqual(landmarks.map(item => item.id).sort(), [...ids].sort())
    for (const { id, position } of landmarks) assert.equal(regionAtPoint(position, landmarks), id)
  })
  test(`${view}: anatomical left is positive X and right is negative X`, () => {
    for (const landmark of landmarksFor(view)) {
      if (landmark.id.startsWith('left_')) assert.ok(landmark.position[0] > 0)
      if (landmark.id.startsWith('right_')) assert.ok(landmark.position[0] < 0)
    }
  })
  test(`${view}: empty space does not select an unrelated region`, () => {
    const landmarks = landmarksFor(view)
    for (const point of [[0, 2.5, 0], [3, 0, 0], [0, 0, 4]]) {
      assert.equal(regionAtPoint(point, landmarks), null)
    }
  })
  test(`${view}: front and back of torso and legs remain distinct`, () => {
    const landmarks = landmarksFor(view)
    for (const [front, rear] of [['abdomen', 'lower_back'], ['left_shin', 'left_calf'], ['right_thigh', 'right_hamstring']]) {
      const a = landmarks.find(item => item.id === front)
      const b = landmarks.find(item => item.id === rear)
      assert.equal(regionAtPoint(a.position, landmarks), front)
      assert.equal(regionAtPoint(b.position, landmarks), rear)
      assert.equal(a.rear, false)
      assert.equal(b.rear, true)
    }
  })
  test(`${view}: rear markers agree with catalog navigation`, () => {
    for (const landmark of landmarksFor(view)) {
      const area = areas.find(area => area.id === landmark.id.replace(/^(left|right)_/, ''))
      assert.equal(landmark.rear, area.back)
    }
  })
}

test('different source poses keep independent landmarks', () => {
  assert.notDeepEqual(landmarksFor('surface'), landmarksFor('muscles'))
})
