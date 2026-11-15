import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { localSources, localTopics } from './library'
import { GuidedExploration } from './GuidedExploration'
import { api } from '@/lib/api'
import type { HealthSource, Topic } from '@/types/api'
import './exploration.css'

const tabs = ['symptoms', 'guide'] as const
const tabNames = { symptoms: 'Symptoms', guide: 'Questions' }
function SourceLinks({ ids, sources }: { ids: string[]; sources: HealthSource[] }) {
  return <div className="issue-sources">{ids.map(id => {
    const source = sources.find(item => item.id === id)
    return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" aria-label={`${source.publisher}: ${source.title}`}>{source.title}<Icon name="external" size={11} /></a> : null
  })}</div>
}

/** One issue inside the Symptoms tab: its description, symptoms and when to get help, with a button that slides
 *  over to its general care steps (and back). Focus moves to the new view so keyboard and screen-reader users follow. */
function IssueBody({ topic, sources, showCare, onCare }: { topic: Topic; sources: HealthSource[]; showCare: boolean; onCare: (open: boolean) => void }) {
  // Set when the user switches views; the next view takes focus as soon as it appears.
  const moveFocus = useRef(false)
  const focusOnMount = (element: HTMLElement | null) => { if (element && moveFocus.current) { moveFocus.current = false; element.focus() } }
  function switchTo(care: boolean) { moveFocus.current = true; onCare(care) }
  return <div className="issue-slider">
    <AnimatePresence mode="wait" initial={false}>
      {showCare
        ? <motion.div key="care" className="issue-pane" initial={{ x: 48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 48, opacity: 0 }} transition={{ duration: .22, ease: 'easeOut' }}>
          <button className="issue-back" onClick={() => switchTo(false)}><Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />Back to symptoms</button>
          <h4 ref={focusOnMount} tabIndex={-1}>General care</h4>
          <p className="micro-copy">Care depends on the cause. This is general information, not a personalised treatment plan.</p>
          <ol className="care-list">{topic.generalCare.map((text, i) => <li key={text}><span>{String(i + 1).padStart(2, '0')}</span><p>{text}</p></li>)}</ol>
          <SourceLinks ids={topic.sourceIds} sources={sources} />
        </motion.div>
        : <motion.div key="symptoms" className="issue-pane" initial={{ x: -48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -48, opacity: 0 }} transition={{ duration: .22, ease: 'easeOut' }}>
          <p className="issue-overview">{topic.overview}</p>
          <h4>What people may notice</h4>
          <ul className="symptom-list">{topic.symptoms.map(text => <li key={text}><span /><p>{text}</p></li>)}</ul>
          <div className="issue-warning"><Icon name="shield" size={16} /><p><strong>Get medical help: </strong>{topic.whenToSeekHelp.join(' ')}</p></div>
          <div className="issue-footer">
            <SourceLinks ids={topic.sourceIds} sources={sources} />
            <button ref={focusOnMount} className="issue-care-button" onClick={() => switchTo(true)}>General care for this<Icon name="arrow" size={14} /></button>
          </div>
        </motion.div>}
    </AnimatePresence>
  </div>
}

export function TopicPanel({ regionId, regionName, onAsk }: { regionId: string; regionName: string; onAsk: (prompt: string) => void }) {
  const [topics, setTopics] = useState<Topic[]>(() => localTopics.filter(topic => topic.regionIds.includes(regionId)))
  const [sources, setSources] = useState<HealthSource[]>(localSources)
  const [saved, setSaved] = useState(true)
  const [tab, setTab] = useState<typeof tabs[number]>('symptoms')
  // Which issue (if any) is showing its general care view instead of its symptoms.
  const [careFor, setCareFor] = useState<string | null>(null)
  useEffect(() => {
    setCareFor(null)
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
  return <section className="topic-panel panel" aria-labelledby="region-title">
    <div className="section-kicker"><span className="number-label">02</span> GET TO KNOW YOUR BODY <span className="tiny-spark">✳</span></div>
    <div className="region-heading"><div><p className="eyebrow">NOW EXPLORING</p><h2 id="region-title">{regionName}</h2></div><span className="region-glyph"><Icon name="body" size={31} /></span></div>
    <p className="panel-intro">Explore possible issues, compare their symptoms and learn about general care.</p>
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
        <GuidedExploration regionId={regionId} regionName={regionName} hidden={tab !== 'guide'} onBrowse={() => setTab('symptoms')} onAsk={onAsk} />
      </div>
      {tab !== 'guide' && <motion.div key={tab} role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .15 }}>
        {tab === 'symptoms' && <>
          <div className="content-label"><h3>Issues to learn about</h3><span>{String(topics.length).padStart(2, '0')} topics</span></div>
          <p className="micro-copy">Open an issue to see what may occur with it and how to care for it. Different conditions can feel alike, so these pages cannot establish a diagnosis.</p>
          {topics.map((topic, index) => <details className="issue-section" key={topic.id} open={index === 0}>
            <summary>{topic.title}<Icon name="chevron" size={16} /></summary>
            <IssueBody topic={topic} sources={sources} showCare={careFor === topic.id} onCare={open => setCareFor(open ? topic.id : null)} />
          </details>)}
        </>}
      </motion.div>}
    </div>
    {tab !== 'guide' && <button className="ask-region" onClick={() => onAsk('Help me understand ' + regionName.toLowerCase())}><Icon name="spark" size={17} /> Ask Tendi about this<Icon name="arrow" size={17} /></button>}
    <div className="source-row"><Icon name="book" size={13} /><span>{saved ? 'Saved library' : 'Library'} · Educational draft · Sources linked with each issue</span></div>
  </section>
}
