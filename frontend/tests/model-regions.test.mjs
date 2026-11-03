import test from 'node:test'
import assert from 'node:assert/strict'
import { landmarksFor, regionAtPoint } from '../src/features/body-explorer/model-regions.ts'

for (const view of ['surface', 'muscles']) {
  test(`${view}: all 11 supported locations resolve to their region`, () => {
    const landmarks = landmarksFor(view)
    assert.equal(landmarks.length, 11)
    assert.equal(new Set(landmarks.map(item => item.id)).size, 11)
    for (const { id, position } of landmarks) assert.equal(regionAtPoint(position, landmarks), id)
  })
  test(`${view}: anatomical left is positive X and right is negative X`, () => {
    for (const landmark of landmarksFor(view)) {
      if (landmark.id.startsWith('left_')) assert.ok(landmark.position[0] > 0)
      if (landmark.id.startsWith('right_')) assert.ok(landmark.position[0] < 0)
    }
  })
  test(`${view}: head, chest and empty space do not select an unrelated region`, () => {
    const landmarks = landmarksFor(view)
    for (const point of [[0, 1.5, 0], [0, .75, .2], [3, 0, 0], [0, 0, 4]]) {
      assert.equal(regionAtPoint(point, landmarks), null)
    }
  })
  test(`${view}: the abdomen does not select the lower back`, () => {
    assert.equal(regionAtPoint([0, .05, .25], landmarksFor(view)), null)
  })
}

test('different source poses keep independent landmarks', () => {
  assert.notDeepEqual(landmarksFor('surface'), landmarksFor('muscles'))
})
