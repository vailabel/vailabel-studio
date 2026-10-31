import { memo, useMemo } from "react"
import { Loader2 } from "lucide-react"
import type { Item } from "@/shared/types/core"
import type { ObjectTag } from "@/shared/lib/label-config/types"
import { parseUtterances } from "@/features/studio/model/lib/structured-fields"
import { useDocumentText } from "../text/use-document-text"
import { inlineFieldText } from "./field-text"
import { ChatView } from "./dialogue-views"

// Chat transcript viewer: the conversation as message bubbles, judged by the
// config's whole-item controls (rating, choices, free-text feedback).
export const ObjectChat = memo(({ object, doc }: { object: ObjectTag; doc: Item }) => {
  const { text, error } = useDocumentText(doc.path, doc.id, inlineFieldText(doc, object.valueKey))
  const messages = useMemo(() => (text == null ? [] : parseUtterances(text, "role", "content")), [text])
  if (error) return <p className="px-6 py-5 text-sm text-destructive">{error}</p>
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
      {text == null ? (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading conversation…
        </span>
      ) : (
        <ChatView messages={messages} />
      )}
    </div>
  )
})

ObjectChat.displayName = "ObjectChat"
