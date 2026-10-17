import { useId } from 'react'

// Tendi's eye: almond outline, asterisk pupil and a lime sparkle.
export function TendiEye({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return <svg className={className} viewBox="0 0 210 160" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id + 'line'} x1="30" y1="30" x2="170" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ddd0ff" />
        <stop offset="1" stopColor="#7752ff" />
      </linearGradient>
      <radialGradient id={id + 'iris'} cx="0.5" cy="0.35" r="0.7">
        <stop offset="0" stopColor="var(--tendi-iris-top)" />
        <stop offset="1" stopColor="var(--tendi-iris)" />
      </radialGradient>
      <filter id={id + 'glow'} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <g className="tendi-eye-shape">
      <path d="M14 92C52 38 148 38 186 92C148 146 52 146 14 92Z" stroke={'url(#' + id + 'line)'} strokeWidth="9" strokeLinejoin="round" />
      <circle cx="100" cy="92" r="33" fill={'url(#' + id + 'iris)'} />
      <g stroke={'url(#' + id + 'line)'} strokeWidth="5.5" strokeLinecap="round">
        <path d="M100 70v44M78 92h44M84.5 76.5l31 31M115.5 76.5l-31 31" />
      </g>
    </g>
    <path className="tendi-eye-sparkle" filter={'url(#' + id + 'glow)'} fill="#a9e27c"
      d="M184 14C186.5 26 191 30.5 203 33C191 35.5 186.5 40 184 52C181.5 40 177 35.5 165 33C177 30.5 181.5 26 184 14Z" />
  </svg>
}
