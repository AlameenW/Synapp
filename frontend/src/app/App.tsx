import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { BodyExplorer } from '@/features/body-explorer/BodyExplorer'
import { previewRegions } from '@/features/body-explorer/preview-regions'
import { TopicPanel } from '@/features/topics/TopicPanel'
import { AssistantPanel } from '@/features/guidance/AssistantPanel'
import { areaNames, localSources, regionArea } from '@/features/topics/library'
import { useTheme } from '@/hooks/useTheme'

export default function App() {
  const { dark, toggleTheme } = useTheme()
  const reduced = useReducedMotion()
  const [selectedId, setSelectedId] = useState('right_shoulder')
  const [back, setBack] = useState(false)
  const [request, setRequest] = useState<{ text: string; id: number } | null>(null)
  const [modal, setModal] = useState<'sources' | 'about' | 'assistant' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (modal) dialog.current?.showModal()
    else dialog.current?.close()
  }, [modal])
  const name = previewRegions.find(region => region.id === selectedId)?.name ?? 'Body'
  const area = regionArea(selectedId)
  function select(id: string) { setSelectedId(id); setBack(id === 'lower_back'); setRequest(null) }
  function ask(text: string) {
    setRequest({ text, id: Date.now() })
    document.getElementById('assistant')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'nearest' })
  }
  return <MotionConfig reducedMotion="user">
    <a href="#explore" className="skip-link">Skip to body explorer</a>
    <div className="app-shell">
      <aside className="side-rail" aria-label="Quick navigation">
        <a className="brand-symbol" href="#explore" aria-label="Synapp home">s<span>✦</span></a>
        <nav><a className="rail-link active" href="#explore" aria-label="Body explorer"><Icon name="body" size={23} /></a><button className="rail-link" onClick={() => setModal('sources')} aria-label="Source library"><Icon name="book" size={21} /></button><a className="rail-link" href="#assistant" aria-label="Movement companion"><Icon name="chat" size={21} /></a></nav>
        <button className="rail-help" onClick={() => setModal('about')} aria-label="About Synapp">?</button>
        <span className="rail-bottom">MOVE<br />WELL.</span>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <a className="wordmark" href="#explore">synapp<span>✳</span></a>
          <nav aria-label="Main navigation"><a className="nav-active" href="#explore">Body explorer</a><button onClick={() => setModal('sources')}>The library</button><button onClick={() => setModal('about')}>How it works <Icon name="external" size={12} /></button></nav>
          <div className="header-actions"><span className="project-badge">A little more in tune.</span><Button variant="ghost" className="theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}><Icon name={dark ? 'sun' : 'moon'} size={19} /></Button></div>
        </header>
        <main id="explore">
          <motion.div className="hero" initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
            <div><div className="hero-kicker"><span /> MADE FOR THE WAY YOU MOVE</div><h1>Your body.<br className="mobile-break" /> <span>Better understood.</span></h1><p>A little curiosity. A clearer picture. Explore your body and find your next step.</p></div>
            <div className="hero-sticker"><Icon name="spark" size={28} /><span>Good movement<br />starts with <strong>you.</strong></span><span className="sticker-arrow">↗</span></div>
          </motion.div>
          <div className="region-bar"><span className="region-bar-label"><span className="number-label">01</span> PICK YOUR FOCUS</span><div className="region-pills" aria-label="Quick region selection">{Object.entries(areaNames).map(([id, label]) => <button key={id} aria-pressed={area === id} onClick={() => select(id === 'lower_back' ? id : (selectedId.startsWith('left_') ? 'left_' : 'right_') + id)}>{area === id && <span className="pill-dot" />}{label}</button>)}</div></div>
          <div className="workspace">
            <BodyExplorer selectedId={selectedId} onSelect={select} dark={dark} back={back} setBack={setBack} />
            <AnimatePresence mode="wait" initial={false}><motion.div key={selectedId} className="details-column" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .16 }}>
              <TopicPanel regionId={selectedId} regionName={name} onAsk={ask} />
            </motion.div></AnimatePresence>
            <AssistantPanel key={selectedId} regionId={selectedId} regionName={name} request={request} onExpand={() => setModal('assistant')} />
          </div>
          <div className="bottom-strip"><div><span className="small-mark">✳</span><strong>Less guesswork. More understanding.</strong><span>Your next chapter of movement starts here.</span></div><button onClick={() => setModal('about')}>Meet Synapp <Icon name="arrow" size={15} /></button></div>
        </main>
        <footer className="footer"><p><Icon name="shield" size={14} /> For education, not diagnosis. Content is an editorial draft awaiting clinical review.</p><button onClick={() => setModal('sources')}>Our sources <Icon name="external" size={12} /></button><span>Move with curiosity.</span></footer>
      </div>
    </div>
    <dialog ref={dialog} className="info-dialog" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null) }} aria-labelledby="dialog-title">
      <div className="dialog-inner"><Button variant="ghost" className="dialog-close" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></Button>
        <span className="dialog-emblem"><Icon name={modal === 'sources' ? 'book' : 'spark'} size={30} /></span>
        <h2 id="dialog-title">{modal === 'sources' ? 'A little knowledge. From real sources.' : modal === 'assistant' ? 'Meet your movement companion.' : 'Get to know the body you move in.'}</h2>
        {modal === 'sources' ? <><p>Our starting library draws on NHS information. These summaries are educational drafts, not clinically reviewed advice.</p><ul className="source-list">{localSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer"><span>{source.title}<small>{source.publisher}</small></span><Icon name="external" size={17} /></a></li>)}</ul></> : modal === 'assistant' ? <><p>The companion currently helps you browse saved educational summaries for your selected region. Questions stay in this page and are cleared when you choose a new region or reload.</p><p>AI personalization is not connected yet. The companion does not interpret your symptoms or create treatment plans. If you need medical advice, speak with a qualified professional.</p></> : <><p>Select a point on the 3D figure, or choose a region from the list. Explore possible explanations, associated symptoms, and general care information, with links to the original sources.</p><div className="dialog-steps"><span>01 <strong>Explore your body</strong></span><span>02 <strong>Follow your curiosity</strong></span><span>03 <strong>Make an informed next step</strong></span></div><p>The figure is stylized and the information cannot establish a diagnosis. If you think you need urgent or emergency care, seek help directly rather than relying on this app.</p></>}
      </div>
    </dialog>
  </MotionConfig>
}

