import { useEffect } from "react"

type ShortcutMap = { [key: string]: () => void }

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Disabled when modifier keys are held
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const isFKey = e.key === "F1" || e.key === "F2" || e.key === "F3" || e.key === "F4"

      // F tuşları her yerden çalışır; diğer kısayollar input/textarea/select'te devre dışı
      if (!isFKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        if (tag === "input" || tag === "textarea" || tag === "select") return
      }

      const handler = shortcuts[e.key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
