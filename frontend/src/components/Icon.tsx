import type { CSSProperties } from 'react'

export type IconName = 'spark' | 'arrow' | 'sun' | 'moon' | 'body' | 'book' | 'chat' | 'rotate' | 'plus' | 'minus' | 'chevron' | 'check' | 'shield' | 'external' | 'close' | 'send' | 'heart' | 'search'
const paths: Record<IconName, string[]> = {
  spark: ['M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
  moon: ['M20.5 13.2A8.7 8.7 0 0 1 10.8 3.5 8.7 8.7 0 1 0 20.5 13.2Z'],
  body: ['M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4', 'm5 9 7 1 7-1M12 10v5m0 0-4 6m4-6 4 6'],
  book: ['M12 5v15M12 5C8 2 4 4 3 4v15c4-1 6-1 9 1 3-2 5-2 9-1V4c-1 0-5-2-9 1Z'],
  chat: ['M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z', 'M8 10h8m-8 4h5'],
  rotate: ['M20 7v5h-5', 'M20 12a8 8 0 1 0-2 5M20 7l-2-2'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  chevron: ['m9 5 7 7-7 7'],
  check: ['m5 12 4 4L19 6'],
  shield: ['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z', 'm8 12 3 3 5-6'],
  external: ['M14 3h7v7m0-7L10 14', 'M10 3H3v18h18v-7'],
  close: ['m6 6 12 12M6 18 18 6'],
  send: ['m3 3 19 9-19 9 4-9-4-9Z', 'M7 12h15'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'm20 20-4.2-4.2'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'],
}
export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{paths[name].map((d, i) => <path d={d} key={i} />)}</svg>
}

