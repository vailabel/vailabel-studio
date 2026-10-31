import { useState } from "react"
import { RefreshCcw } from "lucide-react"
import { SettingRow, SettingsSection } from "@/shared/components/settings-ui"
import { FAMILIES } from "@/shared/components/training/training-config"
import { TrainingTarget } from "@/shared/components/training/training-target"
import { useTrainingAgents } from "@/shared/model/training-agents-viewmodel"
import type {
  ProjectTrainingConfig,
  TrainingFamily,
} from "@/shared/types/project-config"
import { Input } from "@/shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { Switch } from "@/shared/ui/switch"

interface TrainingSettingsSectionProps {
  config: ProjectTrainingConfig
  disabled?: boolean
  onChange: (patch: Partial<ProjectTrainingConfig>) => void
}

/** A number field that commits on blur, so typing "1" on the way to "100"
 *  doesn't save three times. Out-of-range input snaps back to the stored value. */
function NumberField({
  id,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  id: string
  value: number
  min: number
  max: number
  disabled?: boolean
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      id={id}
      type="number"
      className="w-24"
      min={min}
      max={max}
      disabled={disabled}
      value={draft ?? String(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = Math.round(Number(draft))
        if (
          draft !== null &&
          Number.isFinite(parsed) &&
          parsed >= min &&
          parsed <= max
        ) {
          if (parsed !== value) onCommit(parsed)
        }
        setDraft(null)
      }}
    />
  )
}

/**
 * Project → Settings → Training. These are the defaults the training dialog
 * starts from, and — with automatic retraining on — the exact run Studio
 * starts on its own once enough new items are labeled.
 */
export function TrainingSettingsSection({
  config,
  disabled,
  onChange,
}: TrainingSettingsSectionProps) {
  const { agents } = useTrainingAgents()
  const familyLabel = (value: string) =>
    FAMILIES.find((family) => family.value === value)?.label ?? value

  return (
    <SettingsSection
      icon={RefreshCcw}
      title="Training"
      description="Where and how this project's model is trained, and whether Studio retrains it for you."
    >
      <div className="space-y-4">
        <SettingRow
          htmlFor="auto-retrain"
          title="Retrain automatically"
          description="While Studio is open, start a training run once enough newly labeled items have accumulated since the last run."
          control={
            <Switch
              id="auto-retrain"
              checked={config.autoRetrain}
              disabled={disabled}
              onCheckedChange={(checked) => onChange({ autoRetrain: checked })}
            />
          }
        />

        <SettingRow
          htmlFor="min-new-items"
          title="New labeled items before retraining"
          description="How many items must be labeled after a run before the next one starts."
          control={
            <NumberField
              id="min-new-items"
              value={config.minNewItems}
              min={1}
              max={100000}
              disabled={disabled || !config.autoRetrain}
              onCommit={(minNewItems) => onChange({ minNewItems })}
            />
          }
        />

        <SettingRow
          title="Model"
          description="The detector architecture to train."
          control={
            <Select
              value={config.modelFamily}
              disabled={disabled}
              onValueChange={(value) =>
                value && onChange({ modelFamily: value as TrainingFamily })
              }
            >
              <SelectTrigger className="w-52">
                <SelectValue>
                  {(value: string) => familyLabel(value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FAMILIES.map((family) => (
                  <SelectItem key={family.value} value={family.value}>
                    {family.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          htmlFor="auto-epochs"
          title="Epochs"
          description="Passes over the dataset per automatic run. Fine-tuning from the last model needs far fewer than training from scratch."
          control={
            <NumberField
              id="auto-epochs"
              value={config.epochs}
              min={1}
              max={2000}
              disabled={disabled}
              onCommit={(epochs) => onChange({ epochs })}
            />
          }
        />

        <TrainingTarget
          agents={agents}
          agentId={config.agentId}
          onAgentChange={(agentId) => onChange({ agentId })}
          continueFromLast={config.continueFromLast}
          onContinueChange={(continueFromLast) =>
            onChange({ continueFromLast })
          }
          disabled={disabled}
        />
      </div>
    </SettingsSection>
  )
}
