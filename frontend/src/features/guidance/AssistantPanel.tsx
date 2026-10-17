import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { localSources, localTopics } from '@/features/topics/library'
import { api } from '@/lib/api'
import { TendiEye } from './TendiEye'
import './tendi.css'

// mode: where an answer came from. "offline" = the backend couldn't be reached, so the browser used its saved copy.
type Mode = 'ai' | 'library' | 'safety' | 'off_topic' | 'offline'
interface Message { id: number; role: 'user' | 'assistant'; text: string; sources?: string[]; mode?: Mode; notice?: string }
const modeLabel: Record<Mode, string> = { ai: 'AI · Gemini', library: 'Library', safety: 'Safety first', off_topic: 'Health only', offline: 'Library' }

// Ask the backend once whether Tendi's AI is switched on (shared by every region's panel).
let aiStatus: Promise<boolean> | null = null
function getAIStatus() {
  aiStatus ??= api.ready().then(ready => ready.aiEnabled).catch(() => { aiStatus = null; return false })
  return aiStatus
}

/** The saved-library answer, used when the backend can't be reached. */
function libraryReply(regionId: string, regionName: string, text: string): Omit<Message, 'id'> {
  const topics = localTopics.filter(topic => topic.regionIds.includes(regionId))
  const lower = text.toLowerCase()
  const subject = /symptom|feel|notice/.test(lower) ? 'symptoms' : /care|relief|remed|recover/.test(lower) ? 'care' : 'overview'
  const content = subject === 'symptoms' ? [...new Set(topics.flatMap(topic => topic.symptoms))].join('; ') + '.'
    : subject === 'care' ? [...new Set(topics.flatMap(topic => topic.generalCare))].join(' ')
    : topics.map(topic => topic.overview).join(' ')
  return { role: 'assistant', mode: 'offline', text: 'From the ' + regionName.toLowerCase() + ' library: ' + content,
    sources: [...new Set(topics.flatMap(topic => topic.sourceIds))] }
}

export function AssistantPanel({ regionId, regionName, request, onExpand }: {
  regionId: string; regionName: string; request: { text: string; id: number } | null; onExpand: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [aiEnabled, setAIEnabled] = useState<boolean | null>(null)
  const reduced = useReducedMotion()
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const inFlight = useRef<AbortController | null>(null)
  useEffect(() => {
    let active = true
    getAIStatus().then(enabled => { if (active) setAIEnabled(enabled) })
    // Stop any answer still on its way if the panel is removed.
    return () => { active = false; inFlight.current?.abort() }
  }, [])
  useEffect(() => {
    if (request) { setDraft(request.text); input.current?.focus() }
  }, [request])
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' }) }, [messages, pending, reduced])

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending) return
    // Recent turns give Tendi context for follow-up questions (the backend accepts up to 8).
    const history = messages.slice(-8).map(item => ({ role: item.role, text: item.text.slice(0, 2000) }))
    setMessages(previous => [...previous, { id: Date.now(), role: 'user', text: message }])
    setDraft('')
    setPending(true)
    const controller = new AbortController()
    inFlight.current = controller
    try {
      const reply = await api.chat({ regionId, message, history }, controller.signal)
      setAIEnabled(reply.aiEnabled)
      setMessages(previous => [...previous, { id: Date.now(), role: 'assistant', text: reply.reply,
        sources: reply.sourceIds, mode: reply.mode, notice: reply.notice }])
    } catch (error) {
      if (controller.signal.aborted) return
      const reason = error instanceof Error && error.message !== 'Failed to fetch' ? error.message : null
      setMessages(previous => [...previous, { id: Date.now(), ...libraryReply(regionId, regionName, message),
        notice: (reason ?? 'Tendi’s server isn’t reachable.') + ' Here’s the saved library summary instead.' }])
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }
  return <aside className="assistant-panel panel" id="assistant" aria-labelledby="assistant-title">
    <div className="assistant-top"><span className="assistant-avatar"><Icon name="spark" size={23} /></span><div><h2 id="assistant-title">Tendi <span className="assistant-role">· your movement companion</span></h2></div><Button variant="ghost" className="assistant-expand" aria-label="About Tendi" onClick={onExpand}><Icon name="external" size={15} /></Button></div>
    <div className="conversation">
      {!messages.length ? <div className="chat-welcome">
        <TendiEye className="tendi-eye" />
        <h3>Hi, I'm Tendi!<br />A little curious?</h3>
        <p>Like a tendon, I help connect the dots. Ask me about any aches, movements or recovery questions.</p>
        <div className="chat-suggestions">{['Why do my knees ache after squats?', 'How should I warm up before lifting?', 'Soreness or injury: how can I tell?'].map(text => <button key={text} onClick={() => send(text)}>{text}<Icon name="arrow" size={14} /></button>)}</div>
      </div> : <div className="message-list" role="log" aria-label="Conversation with Tendi" aria-live="polite">{messages.map(message => <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={'message ' + message.role + (message.mode ? ' mode-' + message.mode : '')}>
        {message.role === 'assistant' && <span className="message-label"><Icon name={message.mode === 'safety' ? 'shield' : 'spark'} size={13} /> TENDI{message.mode && <span className="message-mode">{modeLabel[message.mode]}</span>}</span>}
        <p>{message.text}</p>
        {message.notice && <p className="message-notice">{message.notice}</p>}
        {message.sources?.map(id => { const source = localSources.find(item => item.id === id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.publisher} source <Icon name="external" size={11} /></a> : null })}
      </motion.div>)}
        {pending && <div className="message assistant tendi-typing" role="status"><span className="message-label"><Icon name="spark" size={13} /> TENDI</span><p><span className="typing-dots" aria-hidden="true"><i /><i /><i /></span> Tendi is thinking…</p></div>}
        <div ref={end} /></div>}
    </div>
    <div className="chat-composer">
      <form onSubmit={event => { event.preventDefault(); send(draft) }}><label className="sr-only" htmlFor="chat-input">Ask Tendi a question</label><input id="chat-input" ref={input} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask Tendi a question…" maxLength={1000} autoComplete="off" /><button disabled={!draft.trim() || pending} aria-label="Send question"><Icon name="arrow" size={19} /></button></form>
      <p><Icon name="shield" size={11} /> {aiEnabled ? 'Your questions are sent to Google Gemini to write answers. Skip personal details. Not medical advice.'
        : aiEnabled === false ? 'AI is off, so Tendi answers from the saved library. Not medical advice.' : 'Not medical advice.'}</p>
    </div>
  </aside>
}

