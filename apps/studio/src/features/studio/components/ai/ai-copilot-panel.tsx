import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  Cpu,
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
import { Button } from "@/shared/ui/button"
import { Markdown } from "@/features/studio/components/ai/markdown"
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
import { COPILOT_TOOLS, type CopilotTool } from "@/features/studio/model/lib/copilot-tools"

interface AiCopilotPanelProps {
  projectId?: string
  imageId?: string
  imageName?: string
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
}

const toolIcon = (id: string): LucideIcon => TOOL_ICONS[id] ?? Sparkles

export function AiCopilotPanel({
  projectId,
  imageId,
  imageName,
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

  const disabled = !imageId || isSending

  // Only enabled tools surface as quick actions; the same set is sent with each
  // turn so the backend won't run a tool the user switched off.
  const activeTools = useMemo(
    () => COPILOT_TOOLS.filter((tool) => enabledTools.includes(tool.id)),
    [enabledTools]
  )

  const submit = (message: string) => {
    if (!imageId || !message.trim() || isSending) return
    void send({ projectId, imageId, message, enabledTools })
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
            {imageName ? imageName : "On-device assistant"}
          </p>
        </div>
        <ToolsMenu
          enabledCount={enabledTools.length}
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

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5"
      >
        {messages.length === 0 ? (
          <CopilotEmptyState
            tools={activeTools}
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
            placeholder={imageId ? "Ask the copilot…" : "Open an image to start"}
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
// gates both the quick actions and what the backend is allowed to run.
function ToolsMenu({
  enabledCount,
  isToolEnabled,
  onToggle,
}: {
  enabledCount: number
  isToolEnabled: (id: string) => boolean
  onToggle: (id: string) => void
}) {
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
            {enabledCount} of {COPILOT_TOOLS.length} on · choose what I can use
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {COPILOT_TOOLS.map((tool) => {
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
  onPick,
  disabled,
}: {
  tools: CopilotTool[]
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
        <p className="text-xs text-muted-foreground">
          I run on-device — detect, review, or describe this image.
        </p>
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
