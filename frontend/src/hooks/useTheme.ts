import { useEffect, useState } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('synapp-theme') === 'dark' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('synapp-theme', dark ? 'dark' : 'light') } catch { /* Storage may be disabled. */ }
  }, [dark])
  return { dark, toggleTheme: () => setDark(value => !value) }
}

