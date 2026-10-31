import { memo } from "react"
import { cn, rgbToRgba } from "@/shared/lib/utils"
import {
  paragraphRuns,
  type ListEntry,
  type ParagraphSpan,
  type Utterance,
} from "@/features/studio/model/lib/structured-fields"

// Presentational renderers for structured text objects — shared by the
// interactive viewers and the read-only context panels.

const ASSISTANT_ROLES = new Set(["assistant", "bot", "agent", "model", "system"])

/** Dialogue rows (Paragraphs): speaker + text, with optional span marks. Each
 *  text cell carries `data-paragraph` so selections map back to utterances. */
export const DialogueView = memo(
  ({ utterances, spans = [] }: { utterances: Utterance[]; spans?: ParagraphSpan[] }) => (
    <ol className="flex flex-col gap-2">
      {utterances.map((utterance, index) => (
        <li key={index} className="grid grid-cols-[8rem_1fr] gap-3 text-sm leading-relaxed">
          <span className="truncate pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {utterance.author || `#${index + 1}`}
          </span>
          <span data-paragraph={index} className="whitespace-pre-wrap">
            {paragraphRuns(utterance.text, index, spans).map((run, at) =>
              run.span ? (
                <mark
                  key={at}
                  className="rounded-sm text-inherit"
                  style={{
                    backgroundColor: rgbToRgba(run.span.color, 0.25),
                    boxShadow: `inset 0 -2px 0 ${run.span.color}`,
                  }}
                  title={run.span.label}
                >
                  {run.text}
                </mark>
              ) : (
                <span key={at}>{run.text}</span>
              )
            )}
          </span>
        </li>
      ))}
    </ol>
  )
)

DialogueView.displayName = "DialogueView"

/** Chat transcript as message bubbles (user right, assistant left). */
export const ChatView = memo(({ messages }: { messages: Utterance[] }) => (
  <ol className="flex flex-col gap-2">
    {messages.map((message, index) => {
      const fromModel = ASSISTANT_ROLES.has(message.author.toLowerCase())
      return (
        <li
          key={index}
          className={cn("flex flex-col gap-0.5", fromModel ? "items-start" : "items-end")}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {message.author || (fromModel ? "assistant" : "user")}
          </span>
          <span
            className={cn(
              "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
              fromModel ? "bg-muted" : "bg-primary text-primary-foreground"
            )}
          >
            {message.text}
          </span>
        </li>
      )
    })}
  </ol>
))

ChatView.displayName = "ChatView"

/** List entries (e.g. search results) as numbered cards. */
export const ListView = memo(({ entries }: { entries: ListEntry[] }) => (
  <ol className="flex flex-col gap-1.5">
    {entries.map((entry, index) => (
      <li key={entry.id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <span className="mr-2 text-xs font-semibold tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <span className="font-medium">{entry.title}</span>
        {entry.body && <p className="mt-0.5 text-muted-foreground">{entry.body}</p>}
      </li>
    ))}
  </ol>
))

ListView.displayName = "ListView"
