import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { aiCopilotService } from "@/services/ai-copilot-service"
import { services } from "@/services"
import {
  ALL_COPILOT_TOOL_IDS,
  sanitizeToolIds,
} from "@/lib/copilot-tools"
import type {
  CopilotProposedAction,
  CopilotTurnResult,
} from "@/types/ai-assistant"

/** Settings key holding the JSON array of enabled copilot tool ids. */
const ENABLED_TOOLS_KEY = "copilot.enabledTools"

export interface CopilotMessage {
  id: string
  role: "user" | "assistant"
  text: string
  /** Present on assistant turns that ran a capability. */
  result?: CopilotTurnResult
  /** Per-proposed-action resolution, keyed by its index in `result.proposedActions`. */
  resolved: Record<number, "approved" | "denied">
}

let messageCounter = 0
const nextId = () => `copilot-${messageCounter++}`

/**
 * Chat state for the local AI copilot. Sending a message runs one turn against
 * the on-device detector; proposed mutations are applied only when the user
 * approves them. Canvas/predictions refresh happens through the existing
 * `studio://domain-event` subscription, so this hook doesn't reload data itself.
 */
export function useAiCopilotViewModel() {
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [isSending, setIsSending] = useState(false)

  const send = useCallback(
    async (args: {
      projectId?: string
      imageId: string
      message: string
      enabledTools?: string[]
    }) => {
      const text = args.message.trim()
      if (!text || isSending) return

      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text, resolved: {} },
      ])
      setIsSending(true)

      try {
        const result = await aiCopilotService.turn({
          projectId: args.projectId,
          imageId: args.imageId,
          message: text,
          enabledTools: args.enabledTools,
        })
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: result.reply,
            result,
            resolved: {},
          },
        ])
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text:
              error instanceof Error
                ? `Something went wrong: ${error.message}`
                : "Something went wrong running the copilot.",
            resolved: {},
          },
        ])
      } finally {
        setIsSending(false)
      }
    },
    [isSending]
  )

  const resolveAction = useCallback(
    async (
      messageId: string,
      index: number,
      action: CopilotProposedAction,
      decision: "approved" | "denied"
    ) => {
      if (decision === "approved") {
        try {
          if (action.kind === "relabel") {
            await aiCopilotService.applyAction({
              kind: "relabel",
              annotationId: action.annotationId,
              toLabel: action.toLabel,
            })
          } else if (action.kind === "createLabel") {
            await aiCopilotService.applyAction({
              kind: "createLabel",
              name: action.name,
              color: action.color,
              projectId: action.projectId,
            })
          } else {
            await aiCopilotService.applyAction({
              kind: "delete",
              annotationId: action.annotationId,
            })
          }
        } catch (error) {
          // Leave the action unresolved so the user can retry — but tell them
          // it failed instead of silently doing nothing.
          toast.error("Couldn't apply that change", {
            description:
              error instanceof Error
                ? error.message
                : "The copilot action failed — please try again.",
          })
          return
        }
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, resolved: { ...message.resolved, [index]: decision } }
            : message
        )
      )
    },
    []
  )

  const clear = useCallback(() => setMessages([]), [])

  return { messages, isSending, send, resolveAction, clear }
}

/**
 * Which copilot tools are enabled, persisted in settings (`copilot.enabledTools`).
 * Defaults to all tools on. The enabled set both curates the quick-action chips
 * and is sent with each turn so the backend never runs a disabled tool.
 */
export function useCopilotTools() {
  const [enabledTools, setEnabledTools] =
    useState<string[]>(ALL_COPILOT_TOOL_IDS)

  useEffect(() => {
    let cancelled = false
    void services
      .getSettingsService()
      .getByKey(ENABLED_TOOLS_KEY)
      .then((setting) => {
        if (cancelled || !setting.value) return
        try {
          const parsed = JSON.parse(setting.value)
          if (Array.isArray(parsed)) setEnabledTools(sanitizeToolIds(parsed))
        } catch {
          // Corrupt value — keep the all-on default.
        }
      })
      .catch(() => {
        // No desktop backend / read failed — keep the all-on default.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next: string[]) => {
    setEnabledTools(next)
    void services
      .getSettingsService()
      .update(ENABLED_TOOLS_KEY, JSON.stringify(next))
      .catch(() => {
        // Best-effort: the in-memory toggle still applies for this session.
      })
  }, [])

  const toggleTool = useCallback(
    (toolId: string) => {
      const has = enabledTools.includes(toolId)
      const next = has
        ? enabledTools.filter((id) => id !== toolId)
        : sanitizeToolIds([...enabledTools, toolId])
      persist(next)
    },
    [enabledTools, persist]
  )

  const isToolEnabled = useCallback(
    (toolId: string) => enabledTools.includes(toolId),
    [enabledTools]
  )

  return { enabledTools, toggleTool, isToolEnabled }
}
