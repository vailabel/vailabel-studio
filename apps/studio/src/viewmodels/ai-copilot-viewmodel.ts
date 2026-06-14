import { useCallback, useState } from "react"
import { toast } from "sonner"
import { aiCopilotService } from "@/services/ai-copilot-service"
import type {
  CopilotProposedAction,
  CopilotTurnResult,
} from "@/types/ai-assistant"

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
