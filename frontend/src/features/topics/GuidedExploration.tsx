import { useEffect, useRef, useState } from 'react'
import rawCatalog from '../../../../content/exploration.json'
import { Icon } from '@/components/Icon'
import { api } from '@/lib/api'
import { localSources, regionArea } from './library'
import { activeQuestions, pruneAnswers } from './exploration-flow'
import type { ExplorationCatalog, ExplorationInput, ExplorationResponse } from '@/types/api'

const catalog = rawCatalog as ExplorationCatalog

export function GuidedExploration({ regionId, regionName, hidden, onBrowse, onAsk }: {
  regionId: string; regionName: string; hidden: boolean; onBrowse: () => void; onAsk: (text: string) => void
}) {
  const profile = catalog.profiles.find(item => item.area === regionArea(regionId))!
  const warnings = catalog.warningSigns.filter(item => item.areas.includes('*') || item.areas.includes(profile.area))
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<ExplorationInput['warningStatus'] | null>(null)
  const [signs, setSigns] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<ExplorationResponse | null>(null)
  const [pending, setPending] = useState(false)
  const [offline, setOffline] = useState(false)
  const request = useRef<AbortController | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const questions = activeQuestions(profile.questions, answers)
  const lastStep = questions.length + 1
  const question = questions[step - 1]
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { heading.current?.focus() }, [step])
  const answerSummary = questions.filter(item => answers[item.id]?.length).map(item => item.prompt + ' ' + item.options.filter(option => (answers[item.id] ?? []).includes(option.id)).map(option => option.label).join('; '))

  function toggleSign(id: string) {
    const next = signs.includes(id) ? signs.filter(value => value !== id) : [...signs, id]
    setSigns(next); setStatus(next.length ? 'selected' : null)
  }
  function choose(id: string) {
    const current = answers[question.id] ?? []
    const next = !question.multiple || id === 'other' ? [id]
      : current.includes(id) ? current.filter(value => value !== id) : [...current.filter(value => value !== 'other'), id].slice(0, 3)
    setAnswers(previous => pruneAnswers(profile.questions, { ...previous, [question.id]: next }))
  }
  async function submit() {
    if (!status || pending) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setOffline(false); setStep(lastStep)
    if (status !== 'none') {
      // Show the selected catalog warning immediately, including while offline.
      // Topic matching is exclusively performed by Swift after a completed form.
      const chosen = warnings.filter(item => signs.includes(item.id))
      const emergency = chosen.some(item => item.level === 'emergency')
      const action = emergency ? 'Seek emergency medical help now. Contact your local emergency number or emergency department.'
        : 'Seek urgent medical advice now. If symptoms are severe or you believe this is an emergency, contact your local emergency number.'
      setResult({ regionId, disposition: emergency ? 'emergency' : 'urgent', summary: action, nextStep: action,
        reasons: status === 'unsure' ? ['You were unsure about a warning sign; get human advice.'] : chosen.map(item => item.label),
        matches: [], sourceIds: [...new Set((status === 'unsure' ? warnings : chosen).flatMap(item => item.sourceIds))], answerSummary: [],
        limitations: ['The warning list is incomplete. Do not wait for this app if you think you need urgent or emergency care.'] })
      return
    }
    setResult(null); setPending(true)
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await api.explore({ regionId, warningStatus: status, warningSigns: signs, answers }, controller.signal)
      if (response.regionId !== regionId || !Array.isArray(response.matches) || !Array.isArray(response.limitations)
        || response.matches.some(match => !['closer', 'possible'].includes(match.fit) || !Array.isArray(match.lessTypicalAnswers))) throw new Error('Invalid exploration response')
      if (!controller.signal.aborted) setResult(response)
    } catch { setOffline(true) }
    finally { clearTimeout(timeout); setPending(false) }
  }

  const sources = result?.sourceIds.map(id => localSources.find(item => item.id === id)).filter(item => item !== undefined) ?? []
  return <section hidden={hidden} className="guided-exploration" aria-label="Guided symptom exploration">
    <div className="guide-heading"><span className="guide-badge"><Icon name="spark" size={16} /> Guided exploration</span><span>{step === lastStep ? 'Your symptom comparison' : step === 0 ? 'Start here' : `${step} of ${questions.length}`}</span></div>
    <div className="guide-progress" aria-hidden="true"><span style={{ width: `${step / lastStep * 100}%` }} /></div>
    {step === 0 && <>
      <h3 ref={heading} tabIndex={-1}>First, check for warning signs.</h3>
      <p className="guide-copy">For {regionName.toLowerCase()}, do any of these urgent warning signs apply now? Ordinary soreness or being unsure of the cause is covered in the symptom questions next.</p>
      <fieldset className="guide-choices"><legend className="sr-only">Current warning signs</legend>
        {warnings.map(item => <label key={item.id} className={'guide-choice warning-choice' + (signs.includes(item.id) ? ' checked' : '')}><input type="checkbox" checked={signs.includes(item.id)} onChange={() => toggleSign(item.id)} /><span>{item.label}</span></label>)}
        <label className={'guide-choice' + (status === 'none' ? ' checked' : '')}><input type="checkbox" checked={status === 'none'} onChange={() => { setSigns([]); setStatus(status === 'none' ? null : 'none') }} /><span>No, none of these warning signs apply</span></label>
        <label className={'guide-choice' + (status === 'unsure' ? ' checked' : '')}><input type="checkbox" checked={status === 'unsure'} onChange={() => { setSigns([]); setStatus(status === 'unsure' ? null : 'unsure') }} /><span>I cannot tell whether an urgent warning sign applies</span></label>
      </fieldset>
      <p className="guide-note">This list cannot rule out an injury or illness. Get help directly if you think you need urgent care.</p>
      <button className="guide-primary" disabled={!status} onClick={() => status === 'none' ? setStep(1) : void submit()}>{status && status !== 'none' ? 'Show help guidance' : 'Continue to questions'}<Icon name="arrow" size={16} /></button>
    </>}
    {step > 0 && step < lastStep && <>
      <h3 ref={heading} tabIndex={-1}>{question.prompt}</h3>
      {question.when && <p className="guide-branch"><Icon name="arrow" size={13} /> Follow-up based on your earlier answer</p>}
      <p className="guide-copy">{question.multiple ? 'Choose up to three. “None of these / I am not sure” is a separate choice.' : 'Choose the closest description. It is fine to be unsure.'}</p>
      <fieldset className="guide-choices"><legend className="sr-only">{question.prompt}</legend>
        {question.options.map(option => <label className={'guide-choice' + ((answers[question.id] ?? []).includes(option.id) ? ' checked' : '')} key={option.id}>
          <input type={question.multiple ? 'checkbox' : 'radio'} name={'guide-' + question.id} checked={(answers[question.id] ?? []).includes(option.id)}
            disabled={question.multiple && option.id !== 'other' && (answers[question.id] ?? []).filter(id => id !== 'other').length >= 3 && !(answers[question.id] ?? []).includes(option.id)}
            onChange={() => choose(option.id)} /><span>{option.label}</span>
        </label>)}
      </fieldset>
      <div className="guide-actions"><button className="guide-secondary" onClick={() => setStep(step - 1)}>Back</button>
        <button className="guide-primary" disabled={!(answers[question.id]?.length)} onClick={() => step === questions.length ? void submit() : setStep(step + 1)}>{step === questions.length ? 'Compare possible issues' : 'Next question'}<Icon name="arrow" size={16} /></button>
      </div>
      <p className="guide-note">Follow-up questions adapt to your answers. “Not sure” here simply leaves that detail unknown. Choices clear when you change body area or reload.</p>
    </>}
    {step === lastStep && <>
      <h3 ref={heading} tabIndex={-1}>{pending ? 'Comparing your symptom patterns…' : offline ? 'Your answers are ready to review.' : result?.disposition === 'emergency' ? 'Get emergency help now.' : result?.disposition === 'urgent' ? 'Get urgent human advice.' : result?.matches.length ? 'Your symptom matches.' : 'A little more detail would help.'}</h3>
      {pending && <p className="guide-copy" role="status">Comparing your observations with issues in the source-linked library.</p>}
      {offline && <div className="guide-offline" role="status"><p>Guided results are unavailable right now. Your answers have not been interpreted. You can retry or browse the saved library.</p><button onClick={() => void submit()} className="guide-secondary">Retry guided results</button></div>}
      {result && <>
        {result.disposition !== 'educational' && <div className={'guide-result ' + result.disposition} role="alert"><Icon name="shield" size={20} /><div><strong>Please act on this</strong><p>{result.nextStep}</p></div></div>}
        <p className="guide-copy">{result.summary}</p>
        {result.disposition !== 'educational' && <ul className="guide-reasons">{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
        {result.disposition === 'educational' && result.matches.map(match => <article className="guide-match" key={match.topic.id}>
          <span className={'guide-fit ' + match.fit}>{match.fit === 'closer' ? 'Closer symptom match' : 'Possible overlap · more detail needed'}</span>
          <h4>{match.topic.title}</h4><p>{match.topic.overview}</p>
          <h5>Why it fits your answers</h5><ul className="guide-match-reason">{match.matchedAnswers.map(text => <li key={text}>{text}</li>)}</ul>
          {match.lessTypicalAnswers.length > 0 && <div className="guide-differences"><h5>What fits less well</h5><ul>{match.lessTypicalAnswers.map(text => <li key={text}>{text}</li>)}</ul><p>These differences do not rule the issue out.</p></div>}
          <h5>General care to read about</h5><ul>{match.topic.generalCare.slice(0, 2).map(text => <li key={text}>{text}</li>)}</ul>
          <details><summary>Compare symptoms, more care and when to get help</summary><h5>What people may notice</h5><ul>{match.topic.symptoms.map(text => <li key={text}>{text}</li>)}</ul><h5>General care information</h5><ul>{match.topic.generalCare.map(text => <li key={text}>{text}</li>)}</ul><h5>Get medical advice</h5><ul>{match.topic.whenToSeekHelp.map(text => <li key={text}>{text}</li>)}</ul></details>
          <div className="guide-sources">{localSources.filter(source => match.topic.sourceIds.includes(source.id)).map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="external" size={11} /></a>)}</div>
        </article>)}
        {result.disposition === 'educational' && <div className="guide-result educational" role="status"><Icon name="book" size={20} /><div><strong>{result.matches.length ? 'Suggested next step' : 'Keep exploring'}</strong><p>{result.nextStep}</p></div></div>}
        <div className="guide-limitations">{result.limitations.map(text => <p key={text}>{text}</p>)}</div>
        {(result.disposition !== 'educational' || result.matches.length === 0) && <div className="guide-sources">{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="external" size={11} /></a>)}</div>}
      </>}
      {!pending && <>
        {answerSummary.length > 0 && <details className="guide-answer-summary"><summary>Review your answers</summary><ul>{(result?.answerSummary.length ? result.answerSummary : answerSummary).map(text => <li key={text}>{text}</li>)}</ul></details>}
        <div className="guide-actions"><button className="guide-secondary" onClick={() => { setResult(null); setOffline(false); setStep(0) }}>Edit answers</button><button className="guide-secondary" onClick={onBrowse}>Browse all issues</button></div>
        {result?.disposition === 'educational' && <><button className="ask-region" onClick={() => onAsk(`Help me understand these patterns for my ${regionName.toLowerCase()}. ${answerSummary.join(' ')} Please explain the library topics without diagnosing me.`)}><Icon name="chat" size={16} /> Prepare a question for Tendi</button><p className="guide-note">This prepares a message. It is sent to Tendi only when you press Send.</p></>}
      </>}
    </>}
  </section>
}
