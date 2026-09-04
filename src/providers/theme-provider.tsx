import { useCallback, useEffect, useMemo, useState } from 'react'

import { THEME_STORAGE_KEY } from '@/constants/app'
import { ThemeContext } from '@/providers/theme-context'
import type { ResolvedTheme, ThemePreference } from '@/types/theme'

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

function readStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    systemQuery().matches ? 'dark' : 'light',
  )

  useEffect(() => {
    const query = systemQuery()
    const onChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light')

    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback((next: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
