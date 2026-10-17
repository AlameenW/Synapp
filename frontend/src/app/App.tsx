import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { BodyExplorer } from '@/features/body-explorer/BodyExplorer'
import { previewRegions } from '@/features/body-explorer/preview-regions'
import { TopicPanel } from '@/features/topics/TopicPanel'
import { AssistantPanel } from '@/features/guidance/AssistantPanel'
import { SearchPage } from '@/features/search/SearchPage'
import { areaNames, localSources, regionArea } from '@/features/topics/library'
import { useTheme } from '@/hooks/useTheme'
import { BrandMark } from '@/components/BrandMark'
import './header.css'

export default function App() {
  const { dark, toggleTheme } = useTheme()
  const reduced = useReducedMotion()
  const [selectedId, setSelectedId] = useState('right_shoulder')
  const [back, setBack] = useState(false)
  const [request, setRequest] = useState<{ text: string; id: number } | null>(null)
  const [modal, setModal] = useState<'sources' | 'about' | 'assistant' | null>(null)
  const [companionOpen, setCompanionOpen] = useState(false)
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const view = hash === '#search' ? 'search' : 'explore'
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (modal) dialog.current?.showModal()
    else dialog.current?.close()
  }, [modal])
  useEffect(() => {
    if (!companionOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !dialog.current?.open) setCompanionOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [companionOpen])
  const name = previewRegions.find(region => region.id === selectedId)?.name ?? 'Body'
  const area = regionArea(selectedId)
  function select(id: string) { setSelectedId(id); setBack(id === 'lower_back'); setRequest(null) }
  function openRegion(id: string) {
    select(id)
    window.location.hash = 'explore'
    window.scrollTo({ top: 0 })
  }
  function ask(text: string) {
    setRequest({ text, id: Date.now() })
    setCompanionOpen(true)
  }
  return <MotionConfig reducedMotion="user">
    <a href="#explore" className="skip-link">Skip to body explorer</a>
    <div className="app-shell">
      <aside className="side-rail" aria-label="Quick navigation">
        <BrandMark />
        <nav><a className={'rail-link' + (view === 'explore' ? ' active' : '')} href="#explore" aria-label="Body explorer" aria-current={view === 'explore' ? 'page' : undefined}><Icon name="body" size={23} /></a><a className={'rail-link' + (view === 'search' ? ' active' : '')} href="#search" aria-label="Search body parts" aria-current={view === 'search' ? 'page' : undefined}><Icon name="search" size={21} /></a><button className={'rail-link' + (companionOpen ? ' active' : '')} onClick={() => setCompanionOpen(open => !open)} aria-label="Tendi, your movement companion" aria-expanded={companionOpen} aria-controls="companion-drawer"><Icon name="chat" size={21} /></button></nav>
        <span className="rail-bottom">MOVE<br />WELL.</span>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <Wordmark />
          <div className="header-actions"><Button variant="ghost" className="theme-toggle help-toggle" onClick={() => setModal('about')} aria-label="How Synapp works" title="How it works">?</Button><Button variant="ghost" className="theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}><Icon name={dark ? 'sun' : 'moon'} size={19} /></Button></div>
        </header>
        {view === 'search' && <SearchPage onOpen={openRegion} />}
        <main id="explore" hidden={view === 'search'}>
          <motion.div className="hero" initial={{ opacity: 0, y: reduced ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
            <div><div className="hero-kicker"><span /> MADE FOR THE WAY YOU MOVE</div><h1>Your body.<br className="mobile-break" /> <span>Better understood.</span></h1><p>A little curiosity. A clearer picture. Explore your body and find your next step.</p></div>
          </motion.div>
          <div className="region-bar"><span className="region-bar-label"><span className="number-label">01</span> PICK YOUR FOCUS</span><div className="region-pills" aria-label="Quick region selection">{Object.entries(areaNames).map(([id, label]) => <button key={id} aria-pressed={area === id} onClick={() => select(id === 'lower_back' ? id : (selectedId.startsWith('left_') ? 'left_' : 'right_') + id)}>{area === id && <span className="pill-dot" />}{label}</button>)}</div></div>
          <div className="workspace">
            <BodyExplorer selectedId={selectedId} onSelect={select} dark={dark} back={back} setBack={setBack} />
            <AnimatePresence mode="wait" initial={false}><motion.div key={selectedId} className="details-column" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .16 }}>
              <TopicPanel regionId={selectedId} regionName={name} onAsk={ask} />
            </motion.div></AnimatePresence>
          </div>
          <div className="bottom-strip"><div><span className="small-mark">✳</span><strong>Less guesswork. More understanding.</strong><span>Your next chapter of movement starts here.</span></div><button onClick={() => setModal('about')}>Meet Synapp <Icon name="arrow" size={15} /></button></div>
        </main>
        <footer className="footer"><p><Icon name="shield" size={14} /> For education, not diagnosis. Content is an editorial draft awaiting clinical review.</p><button onClick={() => setModal('sources')}>Our sources <Icon name="external" size={12} /></button><span>Move with curiosity.</span></footer>
      </div>
    </div>
    <div id="companion-drawer" className={'companion-drawer' + (companionOpen ? ' open' : '')}>
      <button className="companion-toggle" onClick={() => setCompanionOpen(open => !open)} aria-expanded={companionOpen} aria-controls="assistant" aria-label={companionOpen ? 'Close Tendi' : 'Open Tendi'}>
        <Icon name="chevron" size={18} />
      </button>
      <div className="companion-body" inert={!companionOpen}>
        <AssistantPanel regionId={selectedId} regionName={name} request={request} onExpand={() => setModal('assistant')} />
      </div>
    </div>
    <dialog ref={dialog} className="info-dialog" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null) }} aria-labelledby="dialog-title">
      <div className="dialog-inner"><Button variant="ghost" className="dialog-close" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></Button>
        <span className="dialog-emblem"><Icon name={modal === 'sources' ? 'book' : 'spark'} size={30} /></span>
        <h2 id="dialog-title">{modal === 'sources' ? 'A little knowledge. From real sources.' : modal === 'assistant' ? 'Meet Tendi, your movement companion.' : 'Get to know the body you move in.'}</h2>
        {modal === 'sources' ? <><p>Our starting library draws on NHS information. These summaries are educational drafts, not clinically reviewed advice.</p><ul className="source-list">{localSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer"><span>{source.title}<small>{source.publisher}</small></span><Icon name="external" size={17} /></a></li>)}</ul></> : modal === 'assistant' ? <><p>Like a tendon connecting muscle to bone, Tendi connects you to the right information. Ask Tendi about any aches, movements or recovery questions. Tendi answers using Synapp's library, written up by Google Gemini AI. Conversations aren't saved: they clear when you reload the page.</p><p>Each question, plus your last few messages, is sent to Google Gemini to write the answer, so skip names and other personal details. If you mention a warning sign such as chest pain or losing feeling, Tendi points you to urgent help instead of answering. Tendi can make mistakes, doesn't diagnose and doesn't create treatment plans. If you need medical advice, speak with a qualified professional.</p></> : <><p>Select a point on the 3D figure, or choose a region from the list. Explore possible explanations, associated symptoms, and general care information, with links to the original sources.</p><div className="dialog-steps"><span>01 <strong>Explore your body</strong></span><span>02 <strong>Follow your curiosity</strong></span></div><p>The figure is stylized and the information cannot establish a diagnosis. If you think you need urgent or emergency care, seek help directly rather than relying on this app.</p></>}
      </div>
    </dialog>
  </MotionConfig>
}

