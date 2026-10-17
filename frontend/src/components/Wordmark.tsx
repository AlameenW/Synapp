import './wordmark.css'

// The synapp logo: "syn", an eye in place of the "a", then "pp".
export function Wordmark({ href = '#explore' }: { href?: string }) {
  return <a className="wordmark brand-wordmark" href={href} aria-label="synapp home">
    <span aria-hidden="true">syn</span>
    <svg className="wordmark-eye" viewBox="0 0 50 38" fill="none" aria-hidden="true">
      <path d="M4 19C12.5 3.5 37.5 3.5 46 19C37.5 34.5 12.5 34.5 4 19Z" stroke="var(--wordmark-eye)" strokeWidth="5" strokeLinejoin="round" />
      <path d="M25 10C25.9 16 27.2 17.6 33 19C27.2 20.4 25.9 22 25 28C24.1 22 22.8 20.4 17 19C22.8 17.6 24.1 16 25 10Z" fill="var(--wordmark-spark)" />
    </svg>
    <span aria-hidden="true">pp</span>
  </a>
}