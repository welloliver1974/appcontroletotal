import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CornerDownLeft, Search, Sparkles } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { neuralSearch } from '@/data/neural'
import { MODULE_BY_ID } from '@/lib/modules'
import type { SearchDoc } from '@/data/types'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'o que preciso trocar em casa?',
  'quanto gastei com o carro?',
  'minha próxima viagem',
  'fatura do cartão',
]

/** Cmd+K — Neural Omnibox. Mock semantic search over every collection. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen)
  const setOpen = useUiStore((s) => s.setCommandOpen)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [results, setResults] = useState<SearchDoc[]>([])
  const resultsRef = useRef(results)
  resultsRef.current = results

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let active = true
    neuralSearch(query, 8).then((res) => {
      if (active) {
        setResults(res)
        resultsRef.current = res
      }
    })
    return () => { active = false }
  }, [query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  const go = (doc: SearchDoc) => {
    const path = MODULE_BY_ID[doc.module as keyof typeof MODULE_BY_ID]?.path ?? '/dashboard'
    setOpen(false)
    navigate(path)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 sm:pt-28"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="glass w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((s) => Math.min(s + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((s) => Math.max(s - 1, 0))
              } else if (e.key === 'Enter' && results[selected]) {
                e.preventDefault()
                go(results[selected])
              }
            }}
            placeholder="Pergunte qualquer coisa…"
            className="w-full bg-transparent py-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            esc
          </kbd>
        </div>

        {!query && (
          <div className="px-4 py-3">
            <p className="eyebrow mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-400" /> Sugestões
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="chip transition-colors hover:border-indigo-500/40 hover:text-zinc-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto border-t border-zinc-800/70 p-2">
          {query &&
            (results.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm text-zinc-400">Nenhum resultado para "{query}".</p>
                <p className="mt-1 text-xs text-zinc-600">
                  O Hermes ainda não aprendeu — tente termos diferentes.
                </p>
              </div>
            ) : (
              results.map((doc, i) => {
                const mod = MODULE_BY_ID[doc.module as keyof typeof MODULE_BY_ID]
                const Icon = mod?.icon
                return (
                  <button
                    key={doc.id}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => go(doc)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      i === selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]',
                    )}
                  >
                    {Icon && (
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          mod?.soft,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-sm',
                          i === selected ? 'text-zinc-50' : 'text-zinc-200',
                        )}
                      >
                        {doc.title}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {doc.module} · {doc.kind} — {doc.body}
                      </span>
                    </span>
                    <ArrowRight
                      className={cn(
                        'h-4 w-4 shrink-0 text-zinc-600 transition-colors',
                        i === selected && 'text-indigo-400',
                      )}
                    />
                  </button>
                )
              })
            ))}
        </div>

        {query && results.length > 0 && (
          <div className="flex items-center gap-3 border-t border-zinc-800/70 px-4 py-2 text-[10px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> abrir
            </span>
            <span>↑↓ navegar · ⌘K fechar</span>
          </div>
        )}
      </div>
    </div>
  )
}