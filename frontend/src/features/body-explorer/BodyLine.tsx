import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { bodyAreas } from './preview-regions'
import './body-line.css'

type Area = (typeof bodyAreas)[number]

/** "Pick your focus" as a body line: one stop per body area, in head-to-toe order, like stations on a transit map.
 *  Each body group (Head and neck, Torso, ...) is labelled above its first stop. Drag the line sideways with the
 *  mouse (with a little momentum), swipe it on touch screens, or scroll it with a trackpad. */
export function BodyLine({ active, onPick }: { active: string; onPick: (area: Area) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [more, setMore] = useState({ before: false, after: false })
  const [dragging, setDragging] = useState(false)
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0, lastX: 0, lastTime: 0, velocity: 0 })
  const glide = useRef(0)

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    setMore({ before: el.scrollLeft > 2, after: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(glide.current) }
  }, [measure])

  // Keep the selected stop visible, e.g. after picking it on the 3D figure. Only scrolls the line, never the page.
  useEffect(() => {
    const el = track.current
    const stop = el?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!el || !stop || drag.current.down) return
    const start = stop.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft
    const end = start + stop.offsetWidth
    if (start < el.scrollLeft + 60 || end > el.scrollLeft + el.clientWidth - 60) {
      el.scrollTo({ left: start - el.clientWidth / 2 + stop.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [active, reduced])

  // Mouse and pen dragging. Touch already scrolls natively, so it is left to the browser.
  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === 'touch' || event.button !== 0 || !track.current) return
    cancelAnimationFrame(glide.current)
    drag.current = { down: true, moved: false, startX: event.clientX, startScroll: track.current.scrollLeft,
      lastX: event.clientX, lastTime: performance.now(), velocity: 0 }
  }
  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current
    const el = track.current
    if (!state.down || !el) return
    const distance = event.clientX - state.startX
    if (!state.moved) {
      if (Math.abs(distance) < 6) return   // a small wobble is still a click
      state.moved = true
      setDragging(true)
      el.setPointerCapture(event.pointerId)
    }
    el.scrollLeft = state.startScroll - distance
    const now = performance.now()
    state.velocity = (event.clientX - state.lastX) / Math.max(now - state.lastTime, 1)
    state.lastX = event.clientX
    state.lastTime = now
  }
  function onPointerUp() {
    const state = drag.current
    const el = track.current
    if (!state.down) return
    state.down = false
    setDragging(false)
    if (!state.moved || !el || reduced) return
    // Let the line glide to a stop after a quick flick.
    let velocity = state.velocity * 16
    const step = () => {
      velocity *= 0.92
      if (Math.abs(velocity) < 0.5) return
      el.scrollLeft -= velocity
      glide.current = requestAnimationFrame(step)
    }
    glide.current = requestAnimationFrame(step)
  }
  // A drag shouldn't also count as clicking the stop it started on.
  function onClickCapture(event: React.MouseEvent) {
    if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false }
  }

  return <div className={'body-line' + (more.before ? ' more-before' : '') + (more.after ? ' more-after' : '')}>
    <div ref={track} className={'body-line-track' + (dragging ? ' dragging' : '')}
      onScroll={measure} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp} onClickCapture={onClickCapture} onDragStart={event => event.preventDefault()}>
      <ol className="body-line-stops" aria-label="Quick region selection, head to toe">
        {bodyAreas.map((area, index) => {
          const firstInGroup = index === 0 || bodyAreas[index - 1].group !== area.group
          return <li key={area.id} className={firstInGroup ? 'group-start' : undefined}>
            {firstInGroup && <span className="body-line-group" aria-hidden="true">{area.group}</span>}
            <button type="button" aria-pressed={active === area.id} onClick={() => onPick(area)}>
              <span className="body-line-dot" aria-hidden="true" />
              <span className="body-line-name">{area.name}</span>
            </button>
          </li>
        })}
      </ol>
    </div>
  </div>
}
