import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import './explorer-layout.css'

const BodyModel = lazy(() => import('./BodyModel'))
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <div className="model-fallback"><Icon name="body" size={64} /><h3>Explore at your own pace</h3><p>3D isn't available on this device. You can still pick a body part with the buttons above or from the search page.</p></div>
      : this.props.children
  }
}
export function BodyExplorer({ selectedId, onSelect, dark, back, setBack }: {
  selectedId: string; onSelect: (id: string) => void; dark: boolean; back: boolean; setBack: (back: boolean) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  return <section className="anatomy-panel" aria-label="Interactive body explorer">
    <div className="stage-header"><span className="eyebrow">THE BODY AT A GLANCE</span><span className="live-label"><span /> Interactive 3D</span></div>
    <div className="body-stage">
      <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />
      <div className="model-canvas">
        <ModelBoundary><Suspense fallback={<div className="model-fallback"><span className="loading-orbit" /><p>Bringing your body into view…</p></div>}>
          <BodyModel selectedId={selectedId} onSelect={onSelect} dark={dark} back={back} zoom={zoom} reset={reset} />
        </Suspense></ModelBoundary>
      </div>
      <div className="stage-note"><span className="mini-dot" />Tap a point.<br /><strong>Make a connection.</strong></div>
      <div className="zoom-controls">
        <Button variant="ghost" aria-label="Zoom in" disabled={zoom >= 1.25} onClick={() => setZoom(value => Math.min(1.25, value + .1))}><Icon name="plus" size={16} /></Button>
        <Button variant="ghost" aria-label="Zoom out" disabled={zoom <= .85} onClick={() => setZoom(value => Math.max(.85, value - .1))}><Icon name="minus" size={16} /></Button>
        <Button variant="ghost" aria-label="Reset view" onClick={() => { setZoom(1); setBack(false); setReset(value => value + 1) }}><Icon name="rotate" size={16} /></Button>
      </div>
    </div>
    <div className="stage-bottom"><div className="segmented"><button onClick={() => setBack(false)} aria-pressed={!back}>Front</button><button onClick={() => setBack(true)} aria-pressed={back}>Back</button></div><span><Icon name="rotate" size={13} /> Drag to rotate</span></div>
    <p className="anatomy-caption">Stylized anatomy · Left and right refer to your body</p>
  </section>
}

