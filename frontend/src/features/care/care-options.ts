// "Find care" choices. Each opens a Google Maps search in a new tab; Synapp never asks for or sees the user's location.
export type CareId = 'emergency' | 'urgent' | 'physio'
export interface CareOption { id: CareId; title: string; detail: string; url: string }

const mapsSearch = (query: string) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query)

export const careOptions: CareOption[] = [
  { id: 'emergency', title: 'Emergency room', detail: 'For severe or sudden symptoms', url: mapsSearch('emergency room near me') },
  { id: 'urgent', title: 'Urgent care', detail: 'Needs attention soon, but not an emergency', url: mapsSearch('urgent care near me') },
  { id: 'physio', title: 'Physical therapy / sports medicine', detail: 'For ongoing aches, injuries and recovery', url: mapsSearch('physical therapist near me') },
]
