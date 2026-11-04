import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { localSources, localTopics } from './library'
import { GuidedExploration } from './GuidedExploration'
import { api } from '@/lib/api'
import type { HealthSource, Topic } from '@/types/api'
import './exploration.css'

const tabs = ['overview', 'symptoms', 'care', 'guide'] as const
const tabNames = { overview: 'Overview', symptoms: 'Symptoms', care: 'Care', guide: 'Questions' }
function SourceLinks({ ids, sources }: { ids: string[]; sources: HealthSource[] }) {
  return <div className="issue-sources">{ids.map(id => {
    const source = sources.find(item => item.id === id)
    return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" aria-label={`${source.publisher}: ${source.title}`}>{source.title}<Icon name="external" size={11} /></a> : null
  })}</div>
}

export function TopicPanel({ regionId, regionName, onAsk }: { regionId: string; regionName: string; onAsk: (prompt: string) => void }) {
  const [topics, setTopics] = useState<Topic[]>(() => localTopics.filter(topic => topic.regionIds.includes(regionId)))
  const [sources, setSources] = useState<HealthSource[]>(localSources)
  const [saved, setSaved] = useState(true)
  const [tab, setTab] = useState<typeof tabs[number]>('overview')
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    Promise.all([api.topics(regionId, controller.signal), api.sources(controller.signal)])
      .then(([nextTopics, nextSources]) => {
        if (!controller.signal.aborted && nextTopics.length && nextTopics.every(topic => Array.isArray(topic.symptoms) && Array.isArray(topic.generalCare))) {
          setTopics(nextTopics); setSources(nextSources); setSaved(false)
        }
      }).catch(() => { /* Keep the bundled, source-linked library available. */ })
      .finally(() => clearTimeout(timeout))
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [regionId])
  function startGuide() { setTab('guide'); document.getElementById('tab-guide')?.focus() }
  return <section className="topic-panel panel" aria-labelledby="region-title">
    <div className="section-kicker"><span className="number-label">02</span> GET TO KNOW YOUR BODY <span className="tiny-spark">✳</span></div>
    <div className="region-heading"><div><p className="eyebrow">NOW EXPLORING</p><h2 id="region-title">{regionName}<span>.</span></h2></div><span className="region-glyph"><Icon name="body" size={31} /></span></div>
    <p className="panel-intro">Explore possible issues, compare their symptoms and learn about general care.</p>
    {tab !== 'guide' && <button className="guide-launch" onClick={startGuide}><Icon name="spark" size={22} /><span><strong>Help me explore my symptoms</strong><small>A few questions · Warning signs checked first</small></span><Icon name="arrow" size={17} /></button>}
    <div className="topic-tabs" role="tablist" aria-label="Region information">
      {tabs.map(value => <button key={value} role="tab" id={'tab-' + value} aria-controls={'panel-' + value} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
        onKeyDown={event => {
          if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
            setTab(tabs[index]); document.getElementById('tab-' + tabs[index])?.focus()
          }
        }} onClick={() => setTab(value)}>
        {tab === value && <motion.span layoutId="active-topic-tab" className="active-tab-fill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
        <span>{tabNames[value]}</span>
      </button>)}
    </div>
    <div className="topic-content">
      <div id="panel-guide" role="tabpanel" aria-labelledby="tab-guide" hidden={tab !== 'guide'}>
        <GuidedExploration regionId={regionId} regionName={regionName} hidden={tab !== 'guide'} onBrowse={() => setTab('overview')} onAsk={onAsk} />
      </div>
      {tab !== 'guide' && <motion.div key={tab} role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .15 }}>
        {tab === 'overview' && <>
          <div className="content-label"><h3>Issues to learn about</h3><span>{String(topics.length).padStart(2, '0')} topics</span></div>
          <p className="micro-copy">Different conditions can feel alike. These pages cannot establish a diagnosis.</p>
          <div className="topic-card-list">{topics.map((topic, index) => <article className={'topic-card ' + (expanded === topic.id ? 'expanded' : '')} key={topic.id}>
            <button className="topic-card-trigger" aria-expanded={expanded === topic.id} onClick={() => setExpanded(expanded === topic.id ? null : topic.id)}>
              <span className={'topic-icon tint-' + index % 2}><Icon name={index === 0 ? 'body' : 'heart'} size={20} /></span>
              <span><strong>{topic.title.replace(' information', '')}</strong><small>{topic.symptoms.slice(0, 2).join(' · ')}</small></span><Icon name="chevron" size={16} />
            </button>
            <AnimatePresence initial={false}>{expanded === topic.id && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="topic-card-description"><p>{topic.overview}</p><div className="topic-expanded-sources"><SourceLinks ids={topic.sourceIds} sources={sources} /></div><button className="text-button" onClick={() => setTab('symptoms')}>Compare symptoms<Icon name="arrow" size={14} /></button></motion.div>}</AnimatePresence>
          </article>)}</div>
          <div className="insight-card"><span className="insight-icon"><Icon name="spark" size={20} /></span><div><h3>Patterns are useful context.</h3><p>When it started, which movements trigger it and how it affects daily life can help a professional assess the problem.</p></div></div>
        </>}
        {tab === 'symptoms' && <>
          <div className="content-label"><h3>Compare symptom patterns</h3><Icon name="body" size={18} /></div><p className="micro-copy">Open an issue to see what may occur with it. Overlapping symptoms are common.</p>
          {topics.map((topic, index) => <details className="issue-section" key={topic.id} open={index === 0}><summary>{topic.title}<Icon name="chevron" size={16} /></summary><p className="micro-copy">{topic.overview}</p><ul className="symptom-list">{topic.symptoms.map(text => <li key={text}><span /><p>{text}</p></li>)}</ul><SourceLinks ids={topic.sourceIds} sources={sources} /></details>)}
        </>}
        {tab === 'care' && <>
          <div className="content-label"><h3>Care depends on the cause</h3><Icon name="heart" size={18} /></div><p className="micro-copy">Choose an issue to read its general care information. This is not a personalised treatment plan.</p>
          {topics.map((topic, index) => <details className="issue-section" key={topic.id} open={index === 0}><summary>{topic.title}<Icon name="chevron" size={16} /></summary><ol className="care-list">{topic.generalCare.map((text, i) => <li key={text}><span>{String(i + 1).padStart(2, '0')}</span><p>{text}</p></li>)}</ol><div className="care-alert"><Icon name="shield" size={19} /><div><strong>When to get medical help</strong>{topic.whenToSeekHelp.map(text => <p key={text}>{text}</p>)}</div></div><SourceLinks ids={topic.sourceIds} sources={sources} /></details>)}
        </>}
      </motion.div>}
    </div>
    {tab !== 'guide' && <button className="ask-region" onClick={() => onAsk('Help me understand ' + regionName.toLowerCase())}><Icon name="spark" size={17} /> Ask Tendi about this<Icon name="arrow" size={17} /></button>}
    <div className="source-row"><Icon name="book" size={13} /><span>{saved ? 'Saved library' : 'Library'} · Educational draft · Sources linked with each issue</span></div>
  </section>
}
