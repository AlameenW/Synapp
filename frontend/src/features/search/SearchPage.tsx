import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { areaNames, localTopics } from '@/features/topics/library'
import { bodyAreas, previewRegions, regionGroups } from '@/features/body-explorer/preview-regions'
import './search.css'

// Extra words people might type for each body area.
const aliases: Record<string, string[]> = Object.fromEntries(bodyAreas.map(area => [area.id, area.aliases]))

interface Result { area: string; label: string; group: string; topics: string[]; match: string | null }

export function SearchPage({ onOpen }: { onOpen: (regionId: string) => void }) {
  const [query, setQuery] = useState('')
  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    return bodyAreas.flatMap(({ id: area, group }): Result[] => {
      const label = areaNames[area]
      const topics = localTopics.filter(topic => topic.regionIds.some(id => id.endsWith(area)))
      const titles = topics.map(topic => topic.title)
      if (!q) return [{ area, label, group, topics: titles, match: null }]
      const names = [label, 'left ' + label, 'right ' + label, ...aliases[area]].map(text => text.toLowerCase())
      if (names.some(text => text.includes(q))) return [{ area, label, group, topics: titles, match: null }]
      // Otherwise look inside this area's topics (titles, symptoms, overviews).
      const hit = topics.flatMap(topic => [topic.title, ...topic.symptoms, topic.overview]).find(text => text.toLowerCase().includes(q))
      return hit ? [{ area, label, group, topics: titles, match: hit }] : []
    })
  }, [query])
  // Results stay in catalog order, split into their body groups; groups with no matches are left out.
  const groups = regionGroups.map(group => ({ group, items: results.filter(result => result.group === group) })).filter(entry => entry.items.length)

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

    {results.length ? <div className="search-groups">
      {groups.map(({ group, items }, index) => <section key={group} aria-labelledby={'search-group-' + index}>
        <div className="search-group-head"><h2 id={'search-group-' + index}>{group}</h2><span>{String(items.length).padStart(2, '0')}</span></div>
        <ul className="search-rows">
          {items.map(result => <motion.li key={result.area} className="search-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
            <div className="search-row-text">
              <h3>{result.label}</h3>
              {result.match && <p className="search-match">Matches “{result.match}”</p>}
              {result.topics.length > 0 && <p className="search-row-topics">{result.topics.join(' · ')}</p>}
            </div>
            <div className="search-sides">
              {previewRegions.filter(region => region.id === result.area || region.id === 'left_' + result.area || region.id === 'right_' + result.area).map(region =>
                region.side === 'midline'
                  ? <button key={region.id} onClick={() => onOpen(region.id)} aria-label={'Explore ' + region.name.toLowerCase()}>Open <Icon name="arrow" size={13} /></button>
                  : <button key={region.id} onClick={() => onOpen(region.id)} aria-label={'Explore ' + region.name.toLowerCase()}>{region.side === 'left' ? 'Left' : 'Right'}</button>)}
            </div>
          </motion.li>)}
        </ul>
      </section>)}
    </div> : <div className="search-empty">
      <Icon name="search" size={28} />
      <h2>No body parts match “{query.trim()}”.</h2>
      <p>Try a body part like shoulder, knee or back.</p>
    </div>}
  </main>
}
