import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import './explorer-layout.css'
import { previewRegions } from './preview-regions'
import type { BodyView } from './model-regions'

const BodyModel = lazy(() => import('./BodyModel'))
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <div className="model-fallback"><Icon name="body" size={64} /><h3>The body model couldn't load</h3><p>Pick a body part using the region selector below, or try another view.</p><button type="button" onClick={() => window.location.reload()}>Reload viewer</button></div>
      : this.props.children
  }
}
export function BodyExplorer({ selectedId, onSelect, dark, back, setBack }: {
  selectedId: string; onSelect: (id: string) => void; dark: boolean; back: boolean; setBack: (back: boolean) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  const [view, setView] = useState<BodyView>('surface')
  return <section className="anatomy-panel" aria-label="Interactive body explorer">
    <div className="stage-header"><span className="eyebrow">THE BODY AT A GLANCE</span><span className="live-label"><span /> Interactive 3D</span></div>
    <div className="model-views segmented" role="group" aria-label="Body model view">
      <button type="button" aria-pressed={view === 'surface'} onClick={() => setView('surface')}>Surface</button>
      <button type="button" aria-pressed={view === 'muscles'} onClick={() => setView('muscles')}>Muscles</button>
    </div>
    <div className="body-stage">
      <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />
      <div className="model-canvas">
        <ModelBoundary key={view}><Suspense fallback={<div className="model-fallback"><span className="loading-orbit" /><p>Bringing your body into view…</p></div>}>
          <BodyModel selectedId={selectedId} onSelect={onSelect} dark={dark} back={back} zoom={zoom} reset={reset} view={view} />
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
    <label className="accessible-region">Choose a region
      <select value={selectedId} onChange={event => onSelect(event.target.value)} aria-label="Choose a body region">
        {previewRegions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
      </select>
    </label>
    <p className="anatomy-caption">{view === 'surface' ? 'MakeHuman surface' : 'Z-Anatomy muscles and skeleton'} · Left and right refer to your body<br />Illustrative models with different proportions · For education</p>
    <details className="model-credits">
      <summary>Model sources and licenses</summary>
      <p>Surface: the project's johnDoeSynapp character, exported from MakeHuman with its original skin, face and short hairstyle. Core MakeHuman assets are CC0. Fitted shorts use CC0 source data exported by <a href="https://github.com/kblood/CharacterCreator" target="_blank" rel="noreferrer">Kasper Olesen</a>.</p>
      <p>Muscles: <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">Z-Anatomy – The libre 3D atlas of anatomy</a>, CC BY-SA 4.0. BodyParts3D – The Database Center for Life Science, CC BY-SA 2.1 Japan. Mobile adaptation by <a href="https://github.com/slfresh/fitmitwith-anatomy-atlas" target="_blank" rel="noreferrer">Fit Mit With</a>, CC BY-SA 4.0; displayed with Synapp colors. These models have not been clinically validated.</p>
      <p><a href={`${import.meta.env.BASE_URL}models/licenses/Z-Anatomy-ATTRIBUTION.txt`} target="_blank" rel="noreferrer">Full attribution and changes</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">ShareAlike license</a> · <a href={`${import.meta.env.BASE_URL}models/licenses/MakeHuman-export-license.md`} target="_blank" rel="noreferrer">Surface license</a></p>
    </details>
  </section>
}

