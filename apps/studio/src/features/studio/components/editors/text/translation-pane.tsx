import { memo, useEffect, useState } from "react"
import { Languages } from "lucide-react"

interface TranslationPaneProps {
  /** The persisted translation/value for this document. */
  value: string
  /** Persist the edited text (called on blur). */
  onCommit: (text: string) => void
}

// Target-text editor for machine translation / response generation: the source
// is shown in the document pane above; the user writes the target here.
export const TranslationPane = memo(({ value, onCommit }: TranslationPaneProps) => {
  const [draft, setDraft] = useState(value)

  // Re-sync when navigating to another document.
  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <div className="flex max-h-64 shrink-0 flex-col border-t border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground">
        <Languages className="size-3.5" />
        Translation
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit(draft)
        }}
        placeholder="Type the translation here…"
        className="min-h-24 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[15px] leading-7 outline-none"
        spellCheck
      />
    </div>
  )
})

TranslationPane.displayName = "TranslationPane"
