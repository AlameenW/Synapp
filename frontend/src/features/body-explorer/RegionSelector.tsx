import type { BodyRegion } from '@/types/api'

interface Props {
  regions: BodyRegion[]
  selectedId: string
  onSelect: (id: string) => void
}

export function RegionSelector({ regions, selectedId, onSelect }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-label="Body regions">
      {regions.map((region) => (
        <button
          key={region.id}
          type="button"
          aria-pressed={selectedId === region.id}
          onClick={() => onSelect(region.id)}
          className="rounded-xl border border-border px-4 py-3 text-left text-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
        >
          {region.name}
        </button>
      ))}
    </div>
  )
}

