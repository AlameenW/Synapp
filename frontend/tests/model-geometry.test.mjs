import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { Box3, Group, Raycaster, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { landmarksFor, regionAtPoint } from '../src/features/body-explorer/model-regions.ts'
import { regionGeometry, regionIndexAtFace } from '../src/features/body-explorer/region-highlights.ts'

// Geometry checks do not render textures. Supply the image bitmap interface
// used by GLTFLoader so these tests can inspect the real bundled GLBs in Node.
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })

for (const view of ['surface', 'muscles']) {
  test(`${view}: all 37 areas have painted faces and clicks match their visible highlight`, async () => {
    const loader = new GLTFLoader()
    const root = new Group()
    const files = view === 'surface'
      ? ['makehuman-body.glb', 'makehuman-shorts.glb', 'makehuman-hair.glb']
      : ['z-anatomy-muscles.glb']
    for (const file of files) {
      const data = await readFile(new URL('../public/models/' + file, import.meta.url))
      root.add((await loader.parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')).scene)
    }
    const box = new Box3().setFromObject(root)
    const center = box.getCenter(new Vector3())
    const scale = 3.3 / box.getSize(new Vector3()).y
    root.scale.setScalar(scale)
    root.position.set(-center.x * scale, -box.min.y * scale - 1.7, -center.z * scale)
    root.updateMatrixWorld(true)
    const landmarks = landmarksFor(view)
    const covered = new Set()
    root.traverse(object => {
      if (!object.isMesh) return
      const source = object.geometry
      object.geometry = regionGeometry(source, object.matrixWorld, landmarks)
      assert.equal(source.getAttribute('bodyRegion'), undefined, 'cached model geometry stays unmodified')
      const ids = object.geometry.getAttribute('bodyRegion')
      for (let i = 0; i < ids.count; i += 3) {
        const id = ids.getX(i)
        assert.ok(Number.isInteger(id) && id >= 0 && id < landmarks.length)
        assert.equal(id, ids.getX(i + 1))
        assert.equal(id, ids.getX(i + 2))
        covered.add(landmarks[id].id)
      }
    })
    assert.deepEqual([...covered].sort(), landmarks.map(item => item.id).sort(), 'every selectable area has a visible surface')
    for (const landmark of landmarks) {
      const [x, y] = landmark.position
      const ray = new Raycaster(new Vector3(x, y, landmark.rear ? -4 : 4), new Vector3(0, 0, landmark.rear ? 1 : -1))
      const hit = ray.intersectObject(root, true)[0]
      assert.ok(hit, `${landmark.id} must lie on the actual model`)
      assert.equal(regionAtPoint(hit.point.toArray(), landmarks), landmark.id, `${landmark.id}: clicking the mesh under the marker`)
      assert.equal(landmarks[regionIndexAtFace(hit.object.geometry, hit.faceIndex)].id, landmark.id, `${landmark.id}: face selection and shader ID agree`)
    }
  })
}
