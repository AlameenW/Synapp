import { BufferAttribute, BufferGeometry, Matrix4, MeshStandardMaterial, Vector3 } from 'three'
import { type Landmark, type Point } from './model-regions.ts'

// Partition the actual surface into contiguous selectable areas. Unlike the
// bounded landmark hit targets, every triangle on the body belongs to an area.
export function surfaceRegionIndex(point: Point, landmarks: Landmark[]): number {
  if (point[1] >= 1.20) return landmarks.findIndex(item => item.id === 'head')
  if (point[1] >= 1.02 && Math.abs(point[0]) < .16) return landmarks.findIndex(item => item.id === 'neck')
  let index = -1
  let distance = Infinity
  for (let i = 0; i < landmarks.length; i++) {
    const item = landmarks[i]
    if ((point[0] < 0 && item.id.startsWith('left_')) || (point[0] > 0 && item.id.startsWith('right_'))) continue
    const [x, y, z] = item.position
    // Keep joint regions compact so the arm/leg regions cover the length of
    // their muscles rather than leaving broad joint bands on either side.
    const joint = /_(elbow|wrist|knee|ankle)$/.test(item.id)
    const current = ((point[0] - x) ** 2 + (point[1] - y) ** 2 + (point[2] - z) ** 2) * (joint ? 3 : 1)
    if (current < distance) { distance = current; index = i }
  }
  return index
}

export function regionGeometry(source: BufferGeometry, transform: Matrix4, landmarks: Landmark[]): BufferGeometry {
  // Each face has a constant ID: highlight boundaries cannot bleed across
  // shared vertices, and clicking reads the same ID that the shader displays.
  const geometry = source.index ? source.toNonIndexed() : source.clone()
  const positions = geometry.getAttribute('position')
  const regions = new Float32Array(positions.count)
  const point = new Vector3(), corner = new Vector3()
  for (let i = 0; i < positions.count; i += 3) {
    point.set(0, 0, 0)
    for (let j = 0; j < 3; j++) point.add(corner.fromBufferAttribute(positions, i + j))
    point.multiplyScalar(1 / 3).applyMatrix4(transform)
    const region = surfaceRegionIndex(point.toArray() as Point, landmarks)
    regions.fill(region, i, i + 3)
  }
  geometry.setAttribute('bodyRegion', new BufferAttribute(regions, 1))
  return geometry
}

export function regionIndexAtFace(geometry: BufferGeometry, faceIndex: number): number {
  const vertex = geometry.index ? geometry.index.getX(faceIndex * 3) : faceIndex * 3
  return geometry.getAttribute('bodyRegion').getX(vertex)
}

export function highlightUniforms() {
  return { selected: { value: -1 }, hovered: { value: -1 }, strength: { value: 1 } }
}

export function highlightMaterial(material: MeshStandardMaterial, uniforms: ReturnType<typeof highlightUniforms>) {
  material.onBeforeCompile = shader => {
    shader.uniforms.bodySelected = uniforms.selected
    shader.uniforms.bodyHovered = uniforms.hovered
    shader.uniforms.bodyStrength = uniforms.strength
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float bodyRegion;\nvarying float vBodyRegion;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBodyRegion = bodyRegion;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBodyRegion;\nuniform float bodySelected;\nuniform float bodyHovered;\nuniform float bodyStrength;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bodyIsSelected = 1.0 - step(0.1, abs(vBodyRegion - bodySelected));
        float bodyIsHovered = 1.0 - step(0.1, abs(vBodyRegion - bodyHovered));
        float bodyTint = max(bodyIsSelected * 0.70, bodyIsHovered * 0.40);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.44, 0.25, 0.86), bodyTint);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.30, 0.13, 0.62) * max(bodyIsSelected * 0.36, bodyIsHovered * 0.18) * bodyStrength;`)
  }
  material.customProgramCacheKey = () => 'synapp-body-regions-v1'
}
