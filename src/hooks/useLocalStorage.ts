'use client'

import { useEffect, useRef, useState } from 'react'

export function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial)
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) setValue(JSON.parse(raw) as T)
    } catch {
      /* ignore */
    }
    hydrated.current = true
  }, [key])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])

  return [value, setValue]
}
