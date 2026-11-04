import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Bvh, ContactShadows, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useReducedMotion } from 'motion/react'
import { landmarksFor, type BodyView } from './model-regions'
import { previewRegions } from './preview-regions'
import { highlightMaterial, highlightUniforms, regionGeometry, regionIndexAtFace } from './region-highlights'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
  back: boolean
  dark: boolean
  zoom: number
  reset: number
  view: BodyView
}

const modelRoot = `${import.meta.env.BASE_URL}models/`
const surfaceFiles = ['makehuman-body.glb', 'makehuman-shorts.glb', 'makehuman-hair.glb']
interface FigureProps extends Omit<Props, 'zoom' | 'reset'> { hovered: string | null; onHover: (id: string | null) => void }

function SurfaceFigure(props: FigureProps) {
  const [body, shorts, hair] = useGLTF(surfaceFiles.map(file => modelRoot + file))
  const scene = useMemo(() => {
    const root = new Group()
    for (const model of [body, shorts, hair]) root.add(model.scene.clone(true))
    return root
  }, [body, shorts, hair])
  return <LoadedFigure {...props} source={scene} />
}

function MuscleFigure(props: FigureProps) {
  const model = useGLTF(modelRoot + 'z-anatomy-muscles.glb')
  return <LoadedFigure {...props} source={model.scene} />
}

function LoadedFigure({ source, selectedId, onSelect, back, dark, view, hovered, onHover }: FigureProps & { source: Group }) {
  const group = useRef<Group>(null)
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null)
  const initialRotation = useState(back ? Math.PI : 0)[0]
  const reduced = useReducedMotion()
  const invalidate = useThree(state => state.invalidate)
  const landmarks = useMemo(() => landmarksFor(view), [view])
  const uniforms = useMemo(() => highlightUniforms(), [])
  const scene = useMemo(() => {
    const root = source.clone(true)
    const box = new Box3().setFromObject(root)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = 3.3 / size.y
    const normalized = new Group()
    root.scale.setScalar(scale)
    root.position.set(-center.x * scale, -box.min.y * scale - 1.7, -center.z * scale)
    normalized.add(root)
    normalized.updateMatrixWorld(true)
    root.traverse(object => {
      if (!(object instanceof Mesh)) return
      object.geometry = regionGeometry(object.geometry, object.matrixWorld, landmarks)
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(material => {
        const copy = material.clone() as MeshStandardMaterial
        if (view === 'muscles') {
          const context = object.userData.contextType
          copy.color.set(context === 'bone' ? '#e8dcc4' : context === 'connective' ? '#d4b9ac' : '#b35e59')
          copy.roughness = .7
        } else if (object.name.startsWith('Cloth_')) {
          copy.color.set('#625482')
          copy.map = null
          copy.roughness = .88
        }
        highlightMaterial(copy, uniforms)
        return copy
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return normalized
  }, [source, view, landmarks, uniforms])

  useEffect(() => {
    uniforms.selected.value = landmarks.findIndex(item => item.id === selectedId)
    uniforms.hovered.value = landmarks.findIndex(item => item.id === hovered)
    uniforms.strength.value = dark ? 1.35 : 1
    invalidate()
  }, [selectedId, hovered, dark, landmarks, uniforms, invalidate])
  useEffect(() => { invalidate() }, [back, reduced, invalidate])
  useEffect(() => () => {
    scene.traverse(object => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    if (!group.current) return
    const target = back ? Math.PI : 0
    const remaining = target - group.current.rotation.y
    if (Math.abs(remaining) < .001) { group.current.rotation.y = target; return }
    group.current.rotation.y = reduced ? target : group.current.rotation.y + remaining * (1 - Math.exp(-Math.min(delta, .05) * 7))
    invalidate()
  })

  function pickedRegion(event: ThreeEvent<MouseEvent | PointerEvent>) {
    // Read the face's stored ID instead of doing another nearest-area lookup.
    // This exactly matches the highlighted face, including under the shorts.
    if (!(event.object instanceof Mesh) || event.faceIndex == null) return null
    return landmarks[regionIndexAtFace(event.object.geometry, event.faceIndex)]?.id ?? null
  }

  return <><group ref={group} rotation={[0, initialRotation, 0]}>
    <Bvh firstHitOnly indirect>
      <primitive object={scene} dispose={null}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          pointerStart.current = event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null
        }}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          const start = pointerStart.current
          pointerStart.current = null
          if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 5) return
          const region = pickedRegion(event)
          if (region) onSelect(region)
        }}
        onPointerCancel={() => { pointerStart.current = null }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(pickedRegion(event)) }}
        onPointerOut={() => onHover(null)} />
    </Bvh>
  </group><ContactShadows position={[0, -1.73, 0]} opacity={.25} scale={6} blur={2.8} far={4} resolution={256} color="#63567d" frames={1} /></>
}

function CameraControls({ zoom, reset, back }: Pick<Props, 'zoom' | 'reset' | 'back'>) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => { controls.current?.reset() }, [reset, back])
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={false}
    minPolarAngle={Math.PI / 2 - .35} maxPolarAngle={Math.PI / 2 + .35}
    minDistance={5 / zoom} maxDistance={5 / zoom} target={[0, -.05, 0]} />
}

export default function BodyModel(props: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const name = previewRegions.find(region => region.id === (hovered ?? props.selectedId))?.name ?? 'Body'
  return <div className="body-model-root" data-hovering={Boolean(hovered)} onPointerLeave={() => setHovered(null)}>
    <Canvas frameloop="demand" camera={{ position: [0, .1, 5], fov: 43 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}
      fallback={<div className="model-fallback">3D is unavailable in this browser. Use the region selector below to explore.</div>}>
      <ambientLight intensity={props.view === 'surface' ? .3 : 1.25} />
      <hemisphereLight args={['#fff3eb', '#69617d', props.view === 'surface' ? .55 : 1.4]} />
      <directionalLight position={[3, 4, 5]} intensity={props.view === 'surface' ? 2.1 : 2.2} color="#ffffff" />
      <directionalLight position={[-4, 2, 1]} intensity={props.view === 'surface' ? .35 : .8} color="#d6d0f4" />
      <directionalLight position={[1, 2, -4]} intensity={props.view === 'surface' ? .55 : 1.4} color="#e4eeff" />
      <Suspense fallback={null}>
        {props.view === 'surface' ? <SurfaceFigure {...props} hovered={hovered} onHover={setHovered} /> : <MuscleFigure {...props} hovered={hovered} onHover={setHovered} />}
      </Suspense>
      <CameraControls zoom={props.zoom} reset={props.reset} back={props.back} />
    </Canvas>
    <div className="body-region-label"><span>{hovered ? 'PREVIEWING' : 'SELECTED'}</span><strong>{name}</strong></div>
    <ModelLoading view={props.view} />
  </div>
}

function ModelLoading({ view }: { view: BodyView }) {
  const active = useProgress(state => state.active)
  return active ? <div className="model-loading-overlay" role="status"><div className="model-loading"><span className="loading-orbit" /><p>Loading {view === 'surface' ? 'body' : 'muscles'}â€¦</p></div></div> : null
}
