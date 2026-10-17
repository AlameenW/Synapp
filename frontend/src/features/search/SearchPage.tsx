import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { areaNames, localTopics } from '@/features/topics/library'
import './search.css'

// Extra words people might type for each body area.
const aliases: Record<string, string[]> = {
  shoulder: ['arm', 'rotator cuff', 'collarbone'],
  elbow: ['forearm', 'tennis', 'golfer'],
  wrist: ['hand', 'carpal', 'grip'],
  lower_back: ['back', 'spine', 'lumbar', 'hip'],
  knee: ['leg', 'patella', 'kneecap'],
  ankle: ['foot', 'heel', 'achilles'],
}

interface Result { area: string; label: string; topics: string[]; match: string | null }

export function SearchPage({ onOpen }: { onOpen: (regionId: string) => void }) {
  const [query, setQuery] = useState('')
  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    return Object.entries(areaNames).flatMap(([area, label]): Result[] => {
      const topics = localTopics.filter(topic => topic.regionIds.some(id => id.endsWith(area)))
      const titles = topics.map(topic => topic.title)
      if (!q) return [{ area, label, topics: titles, match: null }]
      const names = [label, 'left ' + label, 'right ' + label, ...aliases[area]].map(text => text.toLowerCase())
      if (names.some(text => text.includes(q))) return [{ area, label, topics: titles, match: null }]
      // Otherwise look inside this area's topics (titles, symptoms, overviews).
      const hit = topics.flatMap(topic => [topic.title, ...topic.symptoms, topic.overview]).find(text => text.toLowerCase().includes(q))
      return hit ? [{ area, label, topics: titles, match: hit }] : []
    })
  }, [query])

  return <main className="search-page" id="search">
    <div className="search-hero">
      <div className="hero-kicker"><span /> SEARCH THE BODY</div>
      <h1>Where Does It Hurt?</h1>
      <p>Type a body part, a symptom or an activity to jump straight to it.</p>
    </div>
    <div className="search-box">
      <Icon name="search" size={22} />
      <label className="sr-only" htmlFor="body-search">Search body parts</label>
      <input id="body-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
        placeholder="Try “knee”, “sprain” or “back”…" autoFocus autoComplete="off" maxLength={60} />
      {query && <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16} /></button>}
    </div>
    <p className="search-count" aria-live="polite">{query.trim() ? results.length + (results.length === 1 ? ' match' : ' matches') : 'All body parts'}</p>

    {results.length ? <div className="search-results">
      {results.map(result => <motion.article key={result.area} className="search-card" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="search-card-head">
          <span className="search-card-icon"><Icon name="body" size={20} /></span>
          <h2>{result.label}</h2>
        </div>
        {result.match && <p className="search-match">Matches “{result.match}”</p>}
        <ul className="search-topics">{result.topics.map(title => <li key={title}>{title}</li>)}</ul>
        <div className="search-sides">
          {result.area === 'lower_back'
            ? <button onClick={() => onOpen('lower_back')}>Explore lower back <Icon name="arrow" size={14} /></button>
            : (['left', 'right'] as const).map(side => <button key={side} onClick={() => onOpen(side + '_' + result.area)}>
              {side === 'left' ? 'Left' : 'Right'} {result.label.toLowerCase()} <Icon name="arrow" size={14} />
            </button>)}
        </div>
      </motion.article>)}
    </div> : <div className="search-empty">
      <Icon name="search" size={28} />
      <h2>No body parts match “{query.trim()}”.</h2>
      <p>Try a body part like shoulder, knee or back.</p>
    </div>}
  </main>
}
