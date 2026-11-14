import { Icon } from '@/components/Icon'
import { careOptions, type CareId } from './care-options'
import './care.css'

/** A collapsed "Find care near you" row for a guided-exploration result. Opening it shows each kind of care as a
 *  button that opens Google Maps. `suggested` is listed first and highlighted. */
export function CareOptions({ show, suggested }: { show: CareId[]; suggested: CareId }) {
  const options = show.map(id => careOptions.find(option => option.id === id)!)
  return <details className="care-options">
    <summary>
      <Icon name="pin" size={16} />
      <span>Find care near you</span>
    </summary>
    <div className="care-choices">{options.map(option => <a key={option.id} href={option.url} target="_blank" rel="noreferrer"
      className={option.id === suggested ? 'suggested' : undefined} title={option.detail}
      aria-label={`${option.title}: ${option.detail}. Opens Google Maps in a new tab.`}>
      {option.title}<Icon name="external" size={13} />
    </a>)}</div>
    <p>Opens Google Maps. Synapp doesn't ask for or see your location, and these are search results, not recommendations.</p>
  </details>
}
