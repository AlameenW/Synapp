import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls } from '@react-three/drei'
import { Group, Vector2 } from 'three'
import { useReducedMotion } from 'motion/react'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
  back: boolean
  dark: boolean
  zoom: number
  reset: number
}
type Point = [number, number, number]
const markers: { id: string; position: Point }[] = [
  ...([-1, 1] as const).flatMap(side => {
    const prefix = side === -1 ? 'right_' : 'left_'
    return [
      { id: prefix + 'shoulder', position: [side * .42, .89, .21] as Point },
      { id: prefix + 'elbow', position: [side * .60, .30, .13] as Point },
      { id: prefix + 'wrist', position: [side * .72, -.20, .10] as Point },
      { id: prefix + 'knee', position: [side * .20, -.92, .16] as Point },
      { id: prefix + 'ankle', position: [side * .21, -1.54, .10] as Point },
    ]
  }),
  { id: 'lower_back', position: [0, .10, -.23] },
]

function Figure({ selectedId, onSelect, back, dark }: Omit<Props, 'zoom' | 'reset'>) {
  const group = useRef<Group>(null)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)
  const points = useMemo(() => [[.12, -.29], [.24, -.19], [.27, -.01], [.21, .18], [.26, .49], [.34, .78], [.31, .96], [.14, 1.03]].map(([x, y]) => new Vector2(x, y)), [])
  useFrame((_, delta) => {
    if (group.current) {
      const target = back ? Math.PI : 0
      group.current.rotation.y = reduced ? target : group.current.rotation.y + (target - group.current.rotation.y) * (1 - Math.exp(-delta * 7))
    }
  })
  function choose(id: string, event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.delta < 5) onSelect(id)
  }
  const color = dark ? '#b8b5e6' : '#eceafa'
  const selectedColor = dark ? '#b5a0ff' : '#9274f8'
  function part(position: Point, scale: Point, region?: string, rotation = 0) {
    const active = region === selectedId || region === hovered
    return <mesh position={position} scale={scale} rotation={[0, 0, rotation]}
      onClick={region ? e => choose(region, e) : undefined}
      onPointerOver={region ? e => { e.stopPropagation(); setHovered(region) } : undefined}
      onPointerOut={() => setHovered(null)}>
      <sphereGeometry args={[1, 40, 32]} />
      <meshStandardMaterial color={active ? selectedColor : color} roughness={.32} metalness={.13} />
    </mesh>
  }
  return <group ref={group}>
    <mesh scale={[1, 1, .66]} onClick={e => choose('lower_back', e)}>
      <latheGeometry args={[points, 64]} />
      <meshStandardMaterial color={selectedId === 'lower_back' ? selectedColor : color} roughness={.35} metalness={.13} />
    </mesh>
    {part([0, 1.07, 0], [.11, .20, .11])}
    {part([0, 1.40, .015], [.20, .28, .185])}
    {part([0, -.13, 0], [.28, .29, .20], 'lower_back')}
    {([-1, 1] as const).map(side => {
      const prefix = side === -1 ? 'right_' : 'left_'
      return <group key={side}>
        {part([side * .16, .74, .145], [.185, .23, .095], prefix + 'shoulder', side * -.13)}
        {part([side * .38, .85, 0], [.17, .205, .17], prefix + 'shoulder', side * .26)}
        {part([side * .49, .56, 0], [.12, .32, .13], prefix + 'shoulder', side * .30)}
        {part([side * .59, .28, 0], [.105, .12, .11], prefix + 'elbow')}
        {part([side * .66, .04, 0], [.09, .255, .10], prefix + 'elbow', side * .23)}
        {part([side * .72, -.21, 0], [.073, .10, .075], prefix + 'wrist')}
        {part([side * .75, -.36, .012], [.086, .155, .048], prefix + 'wrist', side * .12)}
        {part([side * .18, -.51, 0], [.16, .39, .185], prefix + 'knee', side * -.03)}
        {part([side * .20, -.91, .012], [.115, .145, .13], prefix + 'knee')}
        {part([side * .205, -1.20, -.014], [.115, .295, .135], prefix + 'ankle')}
        {part([side * .21, -1.51, 0], [.074, .14, .08], prefix + 'ankle')}
        {part([side * .21, -1.65, .095], [.105, .072, .21], prefix + 'ankle')}
      </group>
    })}
    {markers.map(({ id, position }) => <Html key={id} position={position} center occlude zIndexRange={[20, 0]} distanceFactor={5}>
      <button type="button" className={'body-pin ' + (selectedId === id ? 'selected' : '')} aria-label={'Explore ' + id.replaceAll('_', ' ')} aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
        <span />
        {selectedId === id && <span className="pin-label">{id.replaceAll('_', ' ')}</span>}
      </button>
    </Html>)}
  </group>
}

function CameraControls({ zoom, reset, back }: Pick<Props, 'zoom' | 'reset' | 'back'>) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => { controls.current?.reset() }, [reset, back])
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={false}
    minPolarAngle={Math.PI / 2 - .35} maxPolarAngle={Math.PI / 2 + .35}
    minDistance={5 / zoom} maxDistance={5 / zoom} target={[0, -.02, 0]} />
}

export default function BodyModel(props: Props) {
  return <Canvas camera={{ position: [0, .1, 5], fov: 43 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}
    fallback={<div className="model-fallback">3D is unavailable in this browser. Use the region selector below to explore.</div>}>
    <ambientLight intensity={1.6} />
    <directionalLight position={[3, 4, 5]} intensity={3} color="#ffffff" />
    <directionalLight position={[-4, 2, 1]} intensity={2} color="#b7a3ff" />
    <directionalLight position={[1, 2, -4]} intensity={2} color="#b5f1ee" />
    <Figure {...props} />
    <ContactShadows position={[0, -1.75, 0]} opacity={.25} scale={6} blur={2.8} far={4} resolution={256} color="#63567d" frames={1} />
    <CameraControls zoom={props.zoom} reset={props.reset} back={props.back} />
  </Canvas>
}

