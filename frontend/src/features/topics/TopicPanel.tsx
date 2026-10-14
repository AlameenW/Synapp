import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { localSources, localTopics } from './library'
import { api } from '@/lib/api'
import type { HealthSource, Topic } from '@/types/api'

export function TopicPanel({ regionId, regionName, onAsk }: { regionId: string; regionName: string; onAsk: (prompt: string) => void }) {
  const [topics, setTopics] = useState<Topic[]>(() => localTopics.filter(topic => topic.regionIds.includes(regionId)))
  const [sources, setSources] = useState<HealthSource[]>(localSources)
  const [saved, setSaved] = useState(true)
  const [tab, setTab] = useState<'overview' | 'symptoms' | 'care'>('overview')
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    Promise.all([api.topics(regionId, controller.signal), api.sources(controller.signal)])
      .then(([nextTopics, nextSources]) => {
        if (!controller.signal.aborted && nextTopics.length && nextTopics.every(topic => Array.isArray(topic.symptoms) && Array.isArray(topic.generalCare))) {
          setTopics(nextTopics); setSources(nextSources); setSaved(false)
        }
      }).catch(() => { /* The bundled, source-linked library remains available. */ })
      .finally(() => clearTimeout(timeout))
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [regionId])
  const unique = (values: string[]) => [...new Set(values)]
  const sourceIds = unique(topics.flatMap(topic => topic.sourceIds))
  return <section className="topic-panel panel" aria-labelledby="region-title">
    <div className="section-kicker"><span className="number-label">02</span> GET TO KNOW YOUR BODY <span className="tiny-spark">✳</span></div>
    <div className="region-heading"><div><p className="eyebrow">NOW EXPLORING</p><h2 id="region-title">{regionName}<span>.</span></h2></div><span className="region-glyph"><Icon name="body" size={31} /></span></div>
    <p className="panel-intro">A little understanding goes a long way. Explore what could be behind the discomfort.</p>
    <div className="topic-tabs" role="tablist" aria-label="Region information">
      {(['overview', 'symptoms', 'care'] as const).map(value => <button key={value} role="tab" id={'tab-' + value} aria-controls={'panel-' + value} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
        onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            const tabs = ['overview', 'symptoms', 'care'] as const
            const index = (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3
            setTab(tabs[index]); document.getElementById('tab-' + tabs[index])?.focus()
          }
        }} onClick={() => setTab(value)}>
        {tab === value && <motion.span layoutId="active-topic-tab" className="active-tab-fill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
        <span>{value === 'care' ? 'Care & relief' : value[0].toUpperCase() + value.slice(1)}</span>
      </button>)}
    </div>
    <div className="topic-content">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .18 }}>
          {tab === 'overview' && <>
            <div className="content-label"><h3>Possible explanations</h3><span>{String(topics.length).padStart(2, '0')} topics</span></div>
            <p className="micro-copy">Starting points to learn about, not a diagnosis.</p>
            <div className="topic-card-list">{topics.map((topic, index) => <article className={'topic-card ' + (expanded === topic.id ? 'expanded' : '')} key={topic.id}>
              <button className="topic-card-trigger" aria-expanded={expanded === topic.id} onClick={() => setExpanded(expanded === topic.id ? null : topic.id)}>
                <span className={'topic-icon tint-' + index}><Icon name={index === 0 ? 'body' : 'heart'} size={20} /></span>
                <span><strong>{topic.title.replace(' information', '')}</strong><small>{index === 0 ? 'Understand the bigger picture' : 'Take a closer look'}</small></span>
                <Icon name="chevron" size={16} />
              </button>
              <AnimatePresence initial={false}>{expanded === topic.id && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="topic-card-description"><p>{topic.overview}</p><button className="text-button" onClick={() => setTab('symptoms')}>Explore symptoms <Icon name="arrow" size={14} /></button></motion.div>}</AnimatePresence>
            </article>)}</div>
            <div className="insight-card"><span className="insight-icon"><Icon name="spark" size={20} /></span><div><h3>Context makes a difference.</h3><p>When it started, how you move, and what changes the discomfort are useful details to share with a professional.</p></div></div>
          </>}
          {tab === 'symptoms' && <><div className="content-label"><h3>What you might notice</h3><Icon name="body" size={18} /></div><p className="micro-copy">Symptoms can overlap across different conditions.</p><ul className="symptom-list">{unique(topics.flatMap(topic => topic.symptoms)).map(text => <li key={text}><span /><p>{text}</p></li>)}</ul><div className="soft-note">A symptom list can't identify the cause on its own. Persistent or worsening symptoms deserve a professional assessment.</div></>}
          {tab === 'care' && <><div className="content-label"><h3>A gentler next step</h3><Icon name="heart" size={18} /></div><p className="micro-copy">General care information, not a personalized treatment plan.</p><ol className="care-list">{unique(topics.flatMap(topic => topic.generalCare)).map((text, index) => <li key={text}><span>{String(index + 1).padStart(2, '0')}</span><p>{text}</p></li>)}</ol><div className="care-alert"><Icon name="shield" size={19} /><div><strong>Know when to get help</strong>{unique(topics.flatMap(topic => topic.whenToSeekHelp)).map(text => <p key={text}>{text}</p>)}</div></div></>}
        </motion.div>
      </AnimatePresence>
    </div>
    <button className="ask-region" onClick={() => onAsk('Help me understand ' + regionName.toLowerCase())}><Icon name="spark" size={17} /> Explore with your assistant <Icon name="arrow" size={17} /></button>
    <div className="source-row"><Icon name="book" size={13} /><span>{saved ? 'Saved library' : 'Library'} · Educational draft</span>{sourceIds.map(id => {
      const source = sources.find(item => item.id === id)
      return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.publisher} <Icon name="external" size={11} /></a> : null
    })}</div>
  </section>
}

