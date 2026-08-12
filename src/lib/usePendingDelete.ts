import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Two-click inline delete guard: first click arms, second click runs `run`,
 * auto-disarms after 2.5s. One instance per section (no fragile global state).
 */
export function usePendingDelete() {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const request = useCallback(
    (id: string, run: () => void) => {
      window.clearTimeout(timer.current)
      if (pendingDelete === id) {
        setPendingDelete(null)
        run()
      } else {
        setPendingDelete(id)
        timer.current = window.setTimeout(() => {
          setPendingDelete((cur) => (cur === id ? null : cur))
        }, 2500)
      }
    },
    [pendingDelete],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { pendingDelete, request }
}