import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import { Box3, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three'
import { useReducedMotion } from 'motion/react'
import { landmarksFor, regionAtPoint, type BodyView, type Point } from './model-regions'

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
interface FigureProps extends Omit<Props, 'zoom' | 'reset'> { markerLayer: RefObject<HTMLDivElement | null> }

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

function LoadedFigure({ source, selectedId, onSelect, back, dark, view, markerLayer }: FigureProps & { source: Group }) {
  const group = useRef<Group>(null)
  const initialRotation = useState(back ? Math.PI : 0)[0]
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)
  const landmarks = useMemo(() => landmarksFor(view), [view])
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
      const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(material => {
        const copy = material.clone() as MeshStandardMaterial
        if (view === 'muscles') {
          const context = object.userData.contextType
          copy.color.set(context === 'bone' ? '#e8dcc4' : context === 'connective' ? '#d4b9ac' : '#b35e59')
          copy.roughness = .7
        } else if (object.name.startsWith('Cloth_')) {
          copy.color.set('#625482')
          // A matte sportswear finish instead of the source garment's denim print.
          copy.map = null
          copy.roughness = .88
        }
        return copy
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
      const point = new Box3().setFromObject(object).getCenter(new Vector3())
      const data = object.userData
      // Context meshes combine distant structures (e.g. head, hands and feet).
      // Their aggregate bounds must never highlight the whole mesh as one joint.
      const region = view === 'muscles' && data.muscleId
        ? (String(data.key).includes('lumborum') ? 'lower_back' : regionAtPoint(point.toArray() as Point, landmarks))
        : null
      object.userData = { ...data, synappRegion: region }
    })
    return normalized
  }, [source, view, landmarks])
  const pins = useMemo(() => landmarks.map(landmark => {
    const rear = landmark.id === 'lower_back'
    const ray = new Raycaster(new Vector3(landmark.position[0], landmark.position[1], rear ? -4 : 4), new Vector3(0, 0, rear ? 1 : -1))
    const hit = ray.intersectObject(scene, true)[0]
    const position: Point = [...landmark.position]
    if (hit) position[2] = hit.point.z + (rear ? -.045 : .045)
    return { ...landmark, position: new Vector3(...position), lastX: NaN, lastY: NaN }
  }), [landmarks, scene])
  const visibilityRay = useMemo(() => new Raycaster(), [])

  useEffect(() => {
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      const active = object.userData.synappRegion && (object.userData.synappRegion === selectedId || object.userData.synappRegion === hovered)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        const standard = material as MeshStandardMaterial
        standard.emissive.set(active ? '#7853e8' : '#000000')
        standard.emissiveIntensity = active ? (dark ? .55 : .28) : 0
      }
    })
  }, [scene, selectedId, hovered, dark])
  useEffect(() => () => {
    scene.traverse(object => {
      if (object instanceof Mesh) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
      }
    })
  }, [scene])

  useFrame(({ camera, size }, delta) => {
    if (!group.current) return
    const target = back ? Math.PI : 0
    group.current.rotation.y = reduced ? target : group.current.rotation.y + (target - group.current.rotation.y) * (1 - Math.exp(-delta * 7))
    group.current.updateWorldMatrix(true, true)
    for (const pin of pins) {
      const button = markerLayer.current?.querySelector<HTMLButtonElement>(`[data-region="${pin.id}"]`)
      if (!button) continue
      const world = group.current.localToWorld(pin.position.clone())
      const projected = world.clone().project(camera)
      const x = (projected.x + 1) * size.width / 2
      const y = (1 - projected.y) * size.height / 2
      if (Math.abs(x - pin.lastX) < .1 && Math.abs(y - pin.lastY) < .1) continue
      pin.lastX = x
      pin.lastY = y
      visibilityRay.set(camera.position, world.clone().sub(camera.position).normalize())
      const hit = visibilityRay.intersectObject(scene, true)[0]
      button.hidden = projected.z > 1 || projected.z < -1 || Boolean(hit && hit.distance < camera.position.distanceTo(world) - .01)
      button.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    }
  })

  function pickedRegion(event: ThreeEvent<MouseEvent | PointerEvent>) {
    if (!group.current) return null
    return regionAtPoint(group.current.worldToLocal(event.point.clone()).toArray() as Point, landmarks)
  }

  return <><group ref={group} rotation={[0, initialRotation, 0]}>
    <primitive object={scene} dispose={null}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        const region = pickedRegion(event)
        if (region && event.delta < 5) onSelect(region)
      }}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(pickedRegion(event)) }}
      onPointerOut={() => setHovered(null)} />
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
  const markerLayer = useRef<HTMLDivElement>(null)
  return <div className="body-model-root"><Canvas camera={{ position: [0, .1, 5], fov: 43 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}
    fallback={<div className="model-fallback">3D is unavailable in this browser. Use the region selector below to explore.</div>}>
    <ambientLight intensity={props.view === 'surface' ? .3 : 1.25} />
    <hemisphereLight args={['#fff3eb', '#69617d', props.view === 'surface' ? .55 : 1.4]} />
    <directionalLight position={[3, 4, 5]} intensity={props.view === 'surface' ? 2.1 : 2.2} color="#ffffff" />
    <directionalLight position={[-4, 2, 1]} intensity={props.view === 'surface' ? .35 : .8} color="#d6d0f4" />
    <directionalLight position={[1, 2, -4]} intensity={props.view === 'surface' ? .55 : 1.4} color="#e4eeff" />
    <Suspense fallback={null}>
      {props.view === 'surface' ? <SurfaceFigure {...props} markerLayer={markerLayer} /> : <MuscleFigure {...props} markerLayer={markerLayer} />}
    </Suspense>
    <CameraControls zoom={props.zoom} reset={props.reset} back={props.back} />
  </Canvas>
    <div ref={markerLayer} className="model-marker-layer">
      {landmarksFor(props.view).map(({ id }) => <button key={id} type="button" hidden data-region={id}
        className={'body-pin ' + (props.selectedId === id ? 'selected' : '')}
        aria-label={'Explore ' + id.replaceAll('_', ' ')} aria-pressed={props.selectedId === id} onClick={() => props.onSelect(id)}>
        <span />
        {props.selectedId === id && <span className="pin-label">{id.replaceAll('_', ' ')}</span>}
      </button>)}
    </div>
    <ModelLoading view={props.view} />
  </div>
}

function ModelLoading({ view }: { view: BodyView }) {
  const active = useProgress(state => state.active)
  return active ? <div className="model-loading-overlay" role="status"><div className="model-loading"><span className="loading-orbit" /><p>Loading {view === 'surface' ? 'body' : 'muscles'}…</p></div></div> : null
}
