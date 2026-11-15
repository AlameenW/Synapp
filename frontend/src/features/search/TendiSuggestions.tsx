import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { areaNames } from '@/features/topics/library'
import { previewRegions } from '@/features/body-explorer/preview-regions'
import { CareOptions } from '@/features/care/CareOptions'
import type { TendiSearch } from './useTendiSearch'

/** Warning-sign help for the search, shown at the top of the results so it can't be missed. */
export function TendiSafety({ tendi }: { tendi: TendiSearch }) {
  const { state } = tendi
  if (state.status !== 'done' || state.reply.mode !== 'safety') return null
  return <div className="tendi-suggest safety" role="alert">
    <div className="tendi-suggest-head"><Icon name="shield" size={16} /><span>Please act on this</span></div>
    <p className="tendi-safety-text">{state.reply.message}</p>
    <CareOptions show={state.reply.level === 'emergency' ? ['emergency', 'urgent'] : ['urgent', 'emergency']} suggested={state.reply.level === 'emergency' ? 'emergency' : 'urgent'} />
  </div>
}

/** Tendi's page suggestions (or "Ask Tendi"), shown after the regular results. `fallback` is the page's empty state,
 *  shown when Tendi has nothing to add. */
export function TendiSuggestions({ tendi, offerAsk, fallback, onOpen }: {
  tendi: TendiSearch; offerAsk: boolean; fallback?: ReactNode; onOpen: (regionId: string, topicId?: string) => void
}) {
  const { state, query, key, useAI } = tendi
  if (state.status === 'loading') return <div className="tendi-suggest" role="status">
    <div className="tendi-suggest-head"><Icon name="spark" size={16} /><span>Tendi is looking for pages that fit “{query}”</span><span className="tendi-dots" aria-hidden="true"><i /><i /><i /></span></div>
  </div>

  if (state.status === 'done' && state.reply.mode === 'ai' && state.reply.suggestions.length) return <section className="tendi-suggest" aria-labelledby="tendi-suggest-title">
    <div className="tendi-suggest-head"><Icon name="spark" size={16} /><h2 id="tendi-suggest-title">Tendi suggests</h2></div>
    <ul className="tendi-suggest-list">{state.reply.suggestions.map(item => {
      const regions = previewRegions.filter(region => region.id === item.area || region.id === 'left_' + item.area || region.id === 'right_' + item.area)
      return <li key={item.topicId}>
        <div><h3>{item.title}</h3><p><span>{areaNames[item.area] ?? item.area}</span>{item.reason && <> · {item.reason}</>}</p></div>
        <div className="search-sides">{regions.map(region => region.side === 'midline'
          ? <button key={region.id} onClick={() => onOpen(region.id, item.topicId)} aria-label={`Open ${item.title}`}>Open <Icon name="arrow" size={13} /></button>
          : <button key={region.id} onClick={() => onOpen(region.id, item.topicId)} aria-label={`Open ${item.title}, ${region.name.toLowerCase()}`}>{region.side === 'left' ? 'Left' : 'Right'}</button>)}
        </div>
      </li>
    })}</ul>
    <p className="tendi-suggest-note">Suggested by Tendi using Google Gemini, from Synapp's library. Not a diagnosis.</p>
  </section>

  // Nothing to suggest: show the page's own empty state (if any), with a short note when Tendi looked.
  return <>
    {fallback}
    {state.status === 'done' && state.reply.mode === 'ai' && <p className="tendi-suggest-quiet"><Icon name="spark" size={13} /> Tendi couldn't find a matching page either. Try naming the body part.</p>}
    {state.status === 'done' && state.reply.mode === 'off_topic' && <p className="tendi-suggest-quiet"><Icon name="spark" size={13} /> Tendi searches the body and movement only.</p>}
    {state.status === 'error' && tendi.requested && <p className="tendi-suggest-quiet"><Icon name="spark" size={13} /> {state.message}</p>}
    {offerAsk && !useAI && key.length >= 3 && <button className="tendi-ask" onClick={tendi.ask}><Icon name="spark" size={14} /> Not quite it? Ask Tendi</button>}
  </>
}
