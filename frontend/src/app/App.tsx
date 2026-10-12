import { useEffect, useState } from 'react'
import { RegionSelector } from '@/features/body-explorer/RegionSelector'
import { previewRegions } from '@/features/body-explorer/preview-regions'
import { api } from '@/lib/api'
import type { BodyRegion } from '@/types/api'

export default function App() {
  const [regions, setRegions] = useState<BodyRegion[]>(previewRegions)
  const [selectedId, setSelectedId] = useState('right_knee')
  const [status, setStatus] = useState('Connecting to the Swift API…')

  useEffect(() => {
    const controller = new AbortController()
    api.regions(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (!Array.isArray(result) || result.length === 0) throw new Error('No regions')
        setRegions(result)
        setStatus('Connected to the Swift API')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('Local UI preview · Swift API unavailable')
      })
    return () => controller.abort()
  }, [])

  const selected = regions.find((region) => region.id === selectedId)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <header className="mb-16 flex flex-wrap items-center justify-between gap-4">
        <a href="/" className="text-2xl font-semibold tracking-tight">synapp<span className="text-primary">.</span></a>
        <p role="status" className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">{status}</p>
      </header>
      <main>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Movement starts with understanding</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">Where does it hurt?</h1>
        <p className="mb-10 mt-5 max-w-xl text-muted-foreground">Choose a body region to begin exploring. This starter connects the interface to our Swift foundation.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="region-heading" className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 id="region-heading" className="mb-5 text-xl font-medium">Choose a region</h2>
            <RegionSelector regions={regions} selectedId={selectedId} onSelect={setSelectedId} />
            <p className="mt-5 text-sm text-muted-foreground">Left and right refer to your own body.</p>
          </section>
          <section aria-labelledby="detail-heading" aria-live="polite" className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <p className="mb-3 text-xs uppercase tracking-widest text-primary">Selected region</p>
            <h2 id="detail-heading" className="text-3xl font-medium">{selected?.name ?? 'Choose a region'}</h2>
            <div className="my-8 rounded-2xl border border-dashed border-border p-8">
              <h3 className="font-medium">3D explorer coming next</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The interactive body model will share this selection state. A licensed anatomical model has not been added yet.</p>
            </div>
            <h3 className="font-medium">Educational content and AI</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Reviewed topics and personalized feedback are not available in this scaffold.</p>
          </section>
        </div>
      </main>
      <footer className="mt-12 max-w-3xl text-xs leading-relaxed text-muted-foreground">Synapp is a class project in development. It provides educational information, not a medical diagnosis or a replacement for professional care.</footer>
    </div>
  )
}

