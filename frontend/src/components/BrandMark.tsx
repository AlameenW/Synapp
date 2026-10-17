import './brand-mark.css'

// Sidebar logo: a ring with eight spokes and a lime centre.
export function BrandMark() {
  return <a className="brand-symbol brand-mark" href="#explore" aria-label="Synapp home">
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="20.5" stroke="var(--brand-mark-line)" strokeWidth="3" />
      <path d="M24.0 16.5L24.0 9.5M29.3 18.7L34.3 13.7M31.5 24.0L38.5 24.0M29.3 29.3L34.3 34.3M24.0 31.5L24.0 38.5M18.7 29.3L13.7 34.3M16.5 24.0L9.5 24.0M18.7 18.7L13.7 13.7" stroke="var(--brand-mark-line)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4.6" fill="var(--brand-mark-dot)" />
    </svg>
  </a>
}
