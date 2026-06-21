import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  Cpu,
  FileText,
  Lasso,
  Loader2,
  Plus,
  ScanSearch,
  ScanText,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Tags,
  Text,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Prediction } from "@/shared/types/core"
import { Button } from "@/shared/ui/button"
import { Markdown } from "@/features/studio/components/ai/markdown"
import { PredictionReviewPanel } from "@/features/studio/components/ai/prediction-review-panel"
import { Switch } from "@/shared/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover"
import {
  useAiCopilotViewModel,
  useCopilotTools,
} from "@/features/studio/model/ai-copilot-viewmodel"
import type { CopilotMessage } from "@/features/studio/model/ai-copilot-viewmodel"
import {
  copilotToolsFor,
  type CopilotTool,
} from "@/features/studio/model/lib/copilot-tools"

interface AiCopilotPanelProps {
  projectId?: string
  itemId?: string
  /** Name of the open item (image/document/clip), shown in the header. */
  itemName?: string
  /** Project data modality — drives which tools the copilot offers and how the
   *  backend handles the turn. Defaults to image when omitted. */
  modality?: string
  /** Project labeling task — tailors the backend's generic prompts. */
  task?: string
  /** Live AI predictions on the canvas, with batch approve/reject. The copilot is
   *  now the single place to review what the agent proposed — the user just
   *  approves. Image projects only; omitted elsewhere (the bar stays hidden). */
  predictions?: Prediction[]
  onAcceptAllPredictions?: () => Promise<number>
  onRejectAllPredictions?: () => Promise<number>
  /** Optional: when provided, a close button is shown (floating/drawer use). In
   *  the docked right-panel tab it's omitted. */
  onClose?: () => void
}

// Icon per tool id, kept in the view layer (the tool list itself is UI-agnostic).
const TOOL_ICONS: Record<string, LucideIcon> = {
  suggest_labels: Tags,
  detect: ScanSearch,
  segment: Lasso,
  qa_review: ShieldCheck,
  describe: Text,
  ocr: ScanText,
  summarize: FileText,
}

const toolIcon = (id: string): LucideIcon => TOOL_ICONS[id] ?? Sparkles

/** One-line empty-state hint tailored to the modality being labeled. */
function emptyStateHint(modality?: string): string {
  switch (modality) {
    case "text":
      return "I run on-device — suggest labels, summarize, or answer questions about this document."
    case "tabular":
      return "I run on-device — suggest labels or reason over this row's fields."
    case "audio":
      return "I run on-device — suggest label names and help you plan this clip's labels."
    case "video":
      return "I run on-device — suggest label names and help you plan this clip's tracks."
    case "custom":
      return "I run on-device — suggest labels and answer questions about this item."
    default:
      return "I run on-device — detect, review, or describe this image."
  }
}

export function AiCopilotPanel({
  projectId,
  itemId,
  itemName,
  modality,
  task,
  predictions,
  onAcceptAllPredictions,
  onRejectAllPredictions,
  onClose,
}: AiCopilotPanelProps) {
  const { messages, isSending, send, resolveAction, clear } =
    useAiCopilotViewModel()
  const { enabledTools, toggleTool, isToolEnabled } = useCopilotTools()
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, isSending])

  const disabled = !itemId || isSending

  // The tools offered for this modality (image gets the full set; others a
  // smaller, relevant set). Single source for the quick actions, Tools menu,
  // and empty state so they never drift.
  const modalityTools = useMemo(
    () => copilotToolsFor(modality, task),
    [modality, task]
  )

  // Only enabled tools surface as quick actions; the same set is sent with each
  // turn so the backend won't run a tool the user switched off.
  const activeTools = useMemo(
    () => modalityTools.filter((tool) => enabledTools.includes(tool.id)),
    [modalityTools, enabledTools]
  )

  const submit = (message: string) => {
    if (!itemId || !message.trim() || isSending) return
    void send({ projectId, itemId, message, modality, task, enabledTools })
    setDraft("")
  }

  return (
    <aside className="flex h-full w-full flex-col bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            AI Copilot
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {itemName ? itemName : "On-device assistant"}
          </p>
        </div>
        <ToolsMenu
          tools={modalityTools}
          isToolEnabled={isToolEnabled}
          onToggle={toggleTool}
        />
        {messages.length > 0 ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clear}
            aria-label="New chat"
            title="New chat"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        ) : null}
        {onClose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close copilot"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      {/* Review bar: when the agent (or a detector run) has put predictions on the
          canvas, the user approves/rejects them here. Renders nothing when empty. */}
      {predictions && predictions.length > 0 ? (
        <div className="border-b border-border p-3">
          <PredictionReviewPanel
            predictions={predictions}
            onAcceptAll={onAcceptAllPredictions}
            onRejectAll={onRejectAllPredictions}
          />
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5"
      >
        {messages.length === 0 ? (
          <CopilotEmptyState
            tools={activeTools}
            hint={emptyStateHint(modality)}
            onPick={submit}
            disabled={disabled}
          />
        ) : (
          messages.map((message) => (
            <CopilotMessageView
              key={message.id}
              message={message}
              onResolve={resolveAction}
            />
          ))
        )}
        {isSending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Working…
          </div>
        ) : null}
      </div>

      <div className="border-t border-border p-3">
        {messages.length > 0 && activeTools.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {activeTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                disabled={disabled}
                onClick={() => submit(tool.prompt)}
                title={tool.hint}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {tool.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-1.5 focus-within:ring-1 focus-within:ring-ring">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submit(draft)
              }
            }}
            rows={1}
            placeholder={itemId ? "Ask the copilot…" : "Open an item to start"}
            disabled={disabled}
            className="max-h-32 min-h-[1.75rem] flex-1 resize-none bg-transparent px-1.5 py-1 text-sm outline-none disabled:opacity-50"
          />
          <Button
            size="icon-sm"
            className="shrink-0"
            disabled={disabled || !draft.trim()}
            onClick={() => submit(draft)}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </aside>
  )
}

// Floating Tools menu: switch each copilot tool on/off. The choice persists and
// gates both the quick actions and what the backend is allowed to run. Only the
// current modality's tools are listed.
function ToolsMenu({
  tools,
  isToolEnabled,
  onToggle,
}: {
  tools: CopilotTool[]
  isToolEnabled: (id: string) => boolean
  onToggle: (id: string) => void
}) {
  const enabledCount = tools.filter((tool) => isToolEnabled(tool.id)).length
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tools"
            title="Tools the copilot can use"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 gap-0 p-0">
        <div className="border-b border-border px-3.5 py-2.5">
          <p className="text-sm font-semibold leading-tight">Tools</p>
          <p className="text-xs text-muted-foreground">
            {enabledCount} of {tools.length} on · choose what I can use
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {tools.map((tool) => {
            const Icon = toolIcon(tool.id)
            const on = isToolEnabled(tool.id)
            return (
              <label
                key={tool.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">
                    {tool.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tool.hint}
                  </span>
                </span>
                <Switch
                  checked={on}
                  onCheckedChange={() => onToggle(tool.id)}
                  aria-label={`Toggle ${tool.label}`}
                />
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CopilotEmptyState({
  tools,
  hint,
  onPick,
  disabled,
}: {
  tools: CopilotTool[]
  hint: string
  onPick: (prompt: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-1 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">How can I help you label?</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {tools.length > 0 ? (
        <div className="w-full space-y-1.5 text-left">
          {tools.map((tool) => {
            const Icon = toolIcon(tool.id)
            return (
              <button
                key={tool.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(tool.prompt)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background p-2.5 text-left hover:bg-muted disabled:opacity-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">
                    {tool.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tool.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          All tools are off. Open the{" "}
          <SlidersHorizontal className="inline h-3 w-3" /> Tools menu above to
          switch some on.
        </p>
      )}
    </div>
  )
}

function CopilotMessageView({
  message,
  onResolve,
}: {
  message: CopilotMessage
  onResolve: ReturnType<typeof useAiCopilotViewModel>["resolveAction"]
}) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">
        {message.text}
      </div>
    )
  }

  const result = message.result
  const missedFindings =
    result?.findings.filter((finding) => finding.kind === "missed") ?? []

  // Label suggestions render as one-click "add" chips; relabel/delete actions
  // keep the amber approve/deny card. Indices are preserved so resolution still
  // keys into `message.resolved`.
  const indexedActions = (result?.proposedActions ?? []).map((action, index) => ({
    action,
    index,
  }))
  const labelSuggestions = indexedActions.filter(
    (entry) => entry.action.kind === "createLabel"
  )
  const otherActions = indexedActions.filter(
    (entry) => entry.action.kind !== "createLabel"
  )

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Markdown className="text-foreground">{message.text}</Markdown>

      {result && result.predictionsAdded > 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Cpu className="h-3.5 w-3.5" />
          {result.predictionsAdded} prediction
          {result.predictionsAdded === 1 ? "" : "s"} on the canvas to review
        </div>
      ) : null}

      {missedFindings.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {missedFindings.map((finding, index) => (
            <li key={`missed-${index}`} className="flex items-center gap-1.5">
              <span className="text-warning">•</span>
              {finding.message}
            </li>
          ))}
        </ul>
      ) : null}

      {labelSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {labelSuggestions.map(({ action, index }) => {
            if (action.kind !== "createLabel") return null
            const added = message.resolved[index] === "approved"
            return (
              <button
                key={`label-${index}`}
                type="button"
                disabled={added}
                onClick={() =>
                  void onResolve(message.id, index, action, "approved")
                }
                title={added ? "Added to project" : `Add "${action.name}"`}
                className={
                  added
                    ? "inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success"
                    : "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                }
              >
                {added ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {action.name}
              </button>
            )
          })}
        </div>
      ) : null}

      {otherActions.map(({ action, index }) => {
        if (action.kind === "createLabel") return null
        const decision = message.resolved[index]
        return (
          <div
            key={`action-${index}`}
            className="min-w-0 rounded-md border border-warning/30 bg-warning/10 p-2.5"
          >
            <div className="mb-2 flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {action.message}
              </span>
            </div>
            {decision ? (
              <p className="text-xs font-medium text-muted-foreground">
                {decision === "approved" ? "Applied" : "Dismissed"}
              </p>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={() =>
                    void onResolve(message.id, index, action, "approved")
                  }
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 flex-1 text-xs"
                  onClick={() =>
                    void onResolve(message.id, index, action, "denied")
                  }
                >
                  Deny
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
