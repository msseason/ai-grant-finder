import { useState, useRef, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'

const SUGGESTED_TAGS = [
  'Nonprofits', 'Small Business', 'Clean Energy', 'Healthcare', 'Education',
  'Technology', 'Agriculture', 'Arts & Culture', 'Housing', 'Workforce Development',
  'Veterans Services', 'Youth Programs', 'Disability Services', 'Food Security',
  'Mental Health', 'Research & Development', 'Environmental', 'Community Development',
  'Women-Owned', 'Minority-Owned', 'Rural Development', 'STEM', 'Public Safety',
  'Childcare', 'Senior Services', 'Immigration Services', 'Legal Aid',
]

interface IndustryTagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function IndustryTagInput({ value, onChange, placeholder }: IndustryTagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = SUGGESTED_TAGS.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t)
  ).slice(0, 8)

  function addTag(tag: string) {
    const clean = tag.trim()
    if (clean && !value.includes(clean)) {
      onChange([...value, clean])
    }
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      {/* Tag container */}
      <div
        className="min-h-[42px] w-full px-3 py-2 bg-navy-700 border border-navy-500 rounded-lg
          flex flex-wrap gap-1.5 cursor-text transition-all duration-200
          hover:border-navy-400
          focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500/30"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans font-medium
              bg-gold-500/15 text-gold-300 border border-gold-500/25"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="text-gold-400/60 hover:text-gold-300 transition-colors focus:outline-none"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKey}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length === 0 ? (placeholder ?? 'Type a sector and press Enter...') : ''}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (input.length > 0 ? filtered.length > 0 : SUGGESTED_TAGS.filter(t => !value.includes(t)).length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 card-elevated z-20 max-h-48 overflow-y-auto">
          <p className="px-3 py-1 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
            {input ? 'Suggestions' : 'Common sectors'}
          </p>
          {(input ? filtered : SUGGESTED_TAGS.filter(t => !value.includes(t)).slice(0, 10)).map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={() => addTag(tag)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-slate-300
                hover:bg-navy-600 hover:text-slate-100 transition-colors text-left"
            >
              <Plus size={12} className="text-slate-500" />
              {tag}
            </button>
          ))}
          {input && !SUGGESTED_TAGS.some(t => t.toLowerCase() === input.toLowerCase()) && (
            <button
              type="button"
              onMouseDown={() => addTag(input)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-gold-400
                hover:bg-navy-600 transition-colors text-left border-t border-navy-600 mt-1 pt-2"
            >
              <Plus size={12} />
              Add "{input}"
            </button>
          )}
        </div>
      )}

      <p className="mt-1.5 font-sans text-[11px] text-slate-500">
        Press Enter or comma to add. Any sector welcome — not limited to a preset list.
      </p>
    </div>
  )
}
