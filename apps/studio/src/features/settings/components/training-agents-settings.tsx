import { useState } from "react"
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Server,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { SettingsSection } from "@/shared/components/settings-ui"
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog"
import { toErrorMessage } from "@/shared/lib/errors"
import { useTrainingAgents } from "@/shared/model/training-agents-viewmodel"
import type {
  TrainingAgent,
  TrainingAgentInfo,
  TrainingAgentTestRequest,
} from "@/shared/types/training-agent"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

type TestState =
  | { phase: "idle" }
  | { phase: "testing" }
  | { phase: "ok"; info: TrainingAgentInfo }
  | { phase: "error"; message: string }

const describe = (info: TrainingAgentInfo) =>
  [
    `${info.name} · v${info.version} · ${info.os}/${info.arch}`,
    info.gpu ? `GPU: ${info.gpu}` : null,
    `${info.runningJobs} running, ${info.queuedJobs} queued`,
  ]
    .filter(Boolean)
    .join(" — ")

const TestResult = ({ state }: { state: TestState }) => {
  if (state.phase === "idle") return null
  if (state.phase === "testing") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Contacting the agent…
      </p>
    )
  }
  if (state.phase === "ok") {
    return (
      <p className="flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        {describe(state.info)}
      </p>
    )
  }
  return (
    <p className="flex items-start gap-2 text-xs text-destructive">
      <XCircle className="mt-0.5 size-3.5 shrink-0" />
      {state.message}
    </p>
  )
}

/** Run a connection test and report its state as it progresses. */
async function runTest(
  test: (request: TrainingAgentTestRequest) => Promise<TrainingAgentInfo>,
  request: TrainingAgentTestRequest,
  report: (state: TestState) => void
) {
  report({ phase: "testing" })
  try {
    report({ phase: "ok", info: await test(request) })
  } catch (error) {
    report({ phase: "error", message: toErrorMessage(error) })
  }
}

interface AgentFormProps {
  /** The agent being edited, or null to add one. */
  agent: TrainingAgent | null
  onClose: () => void
  onSave: (agent: TrainingAgent, token: string) => Promise<void>
  onTest: (request: TrainingAgentTestRequest) => Promise<TrainingAgentInfo>
}

const AgentForm = ({ agent, onClose, onSave, onTest }: AgentFormProps) => {
  const [name, setName] = useState(agent?.name ?? "")
  const [url, setUrl] = useState(agent?.url ?? "")
  const [token, setToken] = useState("")
  const [test, setTest] = useState<TestState>({ phase: "idle" })
  const [isSaving, setIsSaving] = useState(false)

  // A new agent needs a token; an existing one keeps its stored token unless a
  // new one is typed.
  const canSave =
    Boolean(url.trim()) && (agent !== null || Boolean(token.trim()))
  const testRequest: TrainingAgentTestRequest | null = token.trim()
    ? { url: url.trim(), token: token.trim() }
    : agent && url.trim() === agent.url
      ? { agentId: agent.id }
      : null

  const save = async () => {
    setIsSaving(true)
    try {
      await onSave(
        {
          id: agent?.id ?? crypto.randomUUID(),
          name: name.trim() || url.trim(),
          url: url.trim(),
        },
        token
      )
      onClose()
    } catch (error) {
      toast.error("Could not save the agent", {
        description: toErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {agent ? "Edit training agent" : "Add training agent"}
          </DialogTitle>
          <DialogDescription>
            Run <code>vailabel-agent info</code> on the training machine to see
            its address and access token.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={name}
              placeholder="GPU server"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-url">Address</Label>
            <Input
              id="agent-url"
              value={url}
              placeholder="http://192.168.1.50:8765"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setUrl(event.target.value)
                setTest({ phase: "idle" })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-token">Access token</Label>
            <Input
              id="agent-token"
              type="password"
              value={token}
              autoComplete="off"
              placeholder={agent ? "Leave blank to keep the saved token" : ""}
              onChange={(event) => {
                setToken(event.target.value)
                setTest({ phase: "idle" })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Stored in your system keychain, never in the project or settings
              file.
            </p>
          </div>
          <TestResult state={test} />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={!testRequest || test.phase === "testing"}
            onClick={() =>
              testRequest && void runTest(onTest, testRequest, setTest)
            }
          >
            Test connection
          </Button>
          <Button disabled={!canSave || isSaving} onClick={() => void save()}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Settings → AI Runtime → Training agents: the machines Studio can send
 * training runs to.
 */
export function TrainingAgentsSettings() {
  const { agents, isLoading, save, remove, test } = useTrainingAgents()
  const confirm = useConfirmDialog()
  // `undefined` = form closed, `null` = adding, an agent = editing it.
  const [editing, setEditing] = useState<TrainingAgent | null | undefined>()
  const [tests, setTests] = useState<Record<string, TestState>>({})

  const removeAgent = async (agent: TrainingAgent) => {
    const confirmed = await confirm({
      title: `Remove “${agent.name}”?`,
      description:
        "Studio forgets this agent and its access token. Runs still training on it can no longer be collected and will be marked failed. The agent itself is not uninstalled.",
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    try {
      await remove(agent.id)
    } catch (error) {
      toast.error("Could not remove the agent", {
        description: toErrorMessage(error),
      })
    }
  }

  return (
    <SettingsSection
      icon={Server}
      title="Training agents"
      description="Other machines — typically a GPU server running vailabel-agent — that Studio can train on. Pick one in the training dialog, or per project for automatic retraining."
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
          <Plus className="mr-2 size-4" />
          Add agent
        </Button>
      }
    >
      {agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : "No agents yet. Training runs on this computer until you add one."}
        </p>
      ) : (
        <ul className="space-y-2">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {agent.url}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={tests[agent.id]?.phase === "testing"}
                  onClick={() =>
                    void runTest(test, { agentId: agent.id }, (state) =>
                      setTests((current) => ({ ...current, [agent.id]: state }))
                    )
                  }
                >
                  Test
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${agent.name}`}
                  onClick={() => setEditing(agent)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${agent.name}`}
                  onClick={() => void removeAgent(agent)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <TestResult state={tests[agent.id] ?? { phase: "idle" }} />
            </li>
          ))}
        </ul>
      )}

      {editing !== undefined && (
        <AgentForm
          agent={editing}
          onClose={() => setEditing(undefined)}
          onSave={save}
          onTest={test}
        />
      )}
    </SettingsSection>
  )
}
