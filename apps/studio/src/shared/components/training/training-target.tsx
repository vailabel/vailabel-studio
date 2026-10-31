import { Label } from "@/shared/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { Switch } from "@/shared/ui/switch"
import type { TrainingAgent } from "@/shared/types/training-agent"

/** Select value for "train on this computer" (a Select can't hold `undefined`). */
const LOCAL = "__local__"

interface TrainingTargetProps {
  agents: TrainingAgent[]
  /** Selected agent id; undefined = this computer. */
  agentId?: string
  onAgentChange: (agentId: string | undefined) => void
  continueFromLast: boolean
  onContinueChange: (value: boolean) => void
  disabled?: boolean
}

/**
 * Where a run trains and what it starts from — shared by the quick training
 * dialog and the full training page so the two can't drift.
 */
export function TrainingTarget({
  agents,
  agentId,
  onAgentChange,
  continueFromLast,
  onContinueChange,
  disabled,
}: TrainingTargetProps) {
  // An agent removed in Settings while it was still selected here.
  const selected = agents.some((agent) => agent.id === agentId)
    ? agentId
    : undefined
  const nameOf = (value: string) =>
    value === LOCAL
      ? "This computer"
      : (agents.find((agent) => agent.id === value)?.name ?? "This computer")

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Run on</Label>
        <Select
          value={selected ?? LOCAL}
          disabled={disabled}
          onValueChange={(value) =>
            onAgentChange(!value || value === LOCAL ? undefined : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(value: string) => nameOf(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LOCAL}>This computer</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {agents.length === 0
            ? "Add a training agent in Settings → AI Runtime to train on another machine."
            : selected
              ? "The dataset is uploaded to the agent; the trained model is downloaded back when it finishes."
              : "Trains with the AI runtime on this computer."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="continue-training" className="cursor-pointer">
            Continue from the last model
          </Label>
          <p className="text-xs text-muted-foreground">
            Fine-tune this project&apos;s most recent trained model instead of
            starting from scratch. The first run always starts from the base
            model.
          </p>
        </div>
        <Switch
          id="continue-training"
          checked={continueFromLast}
          disabled={disabled}
          onCheckedChange={onContinueChange}
        />
      </div>
    </div>
  )
}
