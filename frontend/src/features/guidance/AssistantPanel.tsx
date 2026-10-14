import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { localSources, localTopics } from '@/features/topics/library'

interface Message { id: number; role: 'user' | 'assistant'; text: string; sources?: string[] }
export function AssistantPanel({ regionId, regionName, request, onExpand }: {
  regionId: string; regionName: string; request: { text: string; id: number } | null; onExpand: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const reduced = useReducedMotion()
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (request) { setDraft(request.text); input.current?.focus() }
  }, [request])
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' }) }, [messages, reduced])
  function send(text: string) {
    if (!text.trim()) return
    const topics = localTopics.filter(topic => topic.regionIds.includes(regionId))
    const lower = text.toLowerCase()
    const subject = /symptom|feel|notice/.test(lower) ? 'symptoms' : /care|relief|remed|recover/.test(lower) ? 'care' : 'overview'
    const content = subject === 'symptoms' ? [...new Set(topics.flatMap(topic => topic.symptoms))].join('; ') + '.'
      : subject === 'care' ? [...new Set(topics.flatMap(topic => topic.generalCare))].join(' ')
      : topics.map(topic => topic.overview).join(' ')
    const reply = 'From the ' + regionName.toLowerCase() + ' library: ' + content + '\n\nThis is a saved educational summary. AI is not connected, so I can’t interpret personal symptoms or recommend treatment.'
    setMessages(previous => [...previous, { id: Date.now(), role: 'user', text: text.trim() },
      { id: Date.now() + 1, role: 'assistant', text: reply, sources: [...new Set(topics.flatMap(topic => topic.sourceIds))] }])
    setDraft('')
  }
  return <aside className="assistant-panel panel" id="assistant" aria-labelledby="assistant-title">
    <div className="assistant-top"><span className="assistant-avatar"><Icon name="spark" size={23} /></span><div><h2 id="assistant-title">Your movement companion</h2><span><span className="status-dot" /> Library mode</span></div><Button variant="ghost" className="assistant-expand" aria-label="About the assistant" onClick={onExpand}><Icon name="external" size={15} /></Button></div>
    <div className="assistant-context"><span className="mini-dot" /> Exploring <strong>{regionName}</strong></div>
    <div className="conversation">
      {!messages.length ? <div className="chat-welcome">
        <div className="welcome-art" aria-hidden="true"><span className="spark-large">✳</span><span className="spark-small">✦</span><span className="welcome-orbit" /></div>
        <h3>A little curious?<br />You're in the right place.</h3>
        <p>Explore the library together. Pick a question to learn more about your {regionName.toLowerCase()}.</p>
        <div className="chat-suggestions">{['What symptoms should I know?', 'Explore care & relief', 'Give me the overview'].map(text => <button key={text} onClick={() => send(text)}>{text}<Icon name="arrow" size={14} /></button>)}</div>
      </div> : <div className="message-list" role="log" aria-label="Library conversation" aria-live="polite">{messages.map(message => <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={'message ' + message.role}>
        {message.role === 'assistant' && <span className="message-label"><Icon name="spark" size={13} /> SYNAPP LIBRARY</span>}
        <p>{message.text}</p>
        {message.sources?.map(id => { const source = localSources.find(item => item.id === id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.publisher} source <Icon name="external" size={11} /></a> : null })}
      </motion.div>)}<div ref={end} /></div>}
    </div>
    <div className="chat-composer">
      <form onSubmit={event => { event.preventDefault(); send(draft) }}><label className="sr-only" htmlFor="chat-input">Ask the educational library</label><input id="chat-input" ref={input} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Explore a question…" maxLength={300} autoComplete="off" /><button disabled={!draft.trim()} aria-label="Send question"><Icon name="arrow" size={19} /></button></form>
      <p><Icon name="shield" size={11} /> AI personalization is not connected yet.</p>
    </div>
  </aside>
}

