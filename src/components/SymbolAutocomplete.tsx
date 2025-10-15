'use client'

import React from 'react'

export type SymbolAutocompleteProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  allSymbols: string[]
  className?: string
}

export default function SymbolAutocomplete({ value, onChange, placeholder, allSymbols, className }: SymbolAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState(value || '')
  const [hoverIndex, setHoverIndex] = React.useState(-1)

  // Keep local query in sync with external changes
  React.useEffect(() => { setQuery(value || '') }, [value])

  const sanitized = (s: string) => s.toUpperCase().replace(/[^A-Z0-9=.^-]/g, '')

  const suggestions = React.useMemo(() => {
    const q = sanitized(query)
    if (!q) return [] as string[]
    const max = 8
    // Prefer prefix matches, then contains
    const pref = [] as string[]
    const cont = [] as string[]
    for (const s of allSymbols) {
      const u = s.toUpperCase()
      if (u.startsWith(q)) pref.push(s)
      else if (u.includes(q)) cont.push(s)
      if (pref.length >= max) break
    }
    const merged = pref.concat(cont.filter(s => !pref.includes(s)))
    return merged.slice(0, max)
  }, [allSymbols, query])

  const commit = (v: string) => {
    const sv = sanitized(v)
    onChange(sv)
    setQuery(sv)
    setOpen(false)
    setHoverIndex(-1)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') { setOpen(false); setHoverIndex(-1); return }
    if (e.key === 'ArrowDown') { setHoverIndex(h => Math.min((suggestions.length - 1), h + 1)); e.preventDefault(); return }
    if (e.key === 'ArrowUp') { setHoverIndex(h => Math.max(-1, h - 1)); e.preventDefault(); return }
    if (e.key === 'Enter') {
      if (hoverIndex >= 0 && hoverIndex < suggestions.length) {
        commit(suggestions[hoverIndex])
        e.preventDefault()
      } else {
        commit(query)
      }
    }
  }

  return (
    <div className={`relative ${className||''}`}>
      <input
        value={query}
        onChange={e => { const v = sanitized(e.target.value); setQuery(v); onChange(v); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-40 max-h-56 overflow-auto rounded-md border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-lg">
          <ul className="py-1 text-sm">
            {suggestions.map((s, i) => (
              <li
                key={s}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(-1)}
                onMouseDown={e => { e.preventDefault(); commit(s) }}
                className={`px-2 py-1 cursor-pointer ${i===hoverIndex? 'bg-blue-600/30 text-white' : 'text-gray-200 hover:bg-white/10'}`}
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
