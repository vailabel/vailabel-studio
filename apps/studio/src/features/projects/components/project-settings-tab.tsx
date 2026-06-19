import { useState } from "react"
import {
  Save,
  Bot,
  Download,
  AlertTriangle,
  Trash2,
  Cloud,
} from "lucide-react"
import { Switch } from "@/shared/ui/switch"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Slider } from "@/shared/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import {
  SettingsSection,
  SettingRow,
  SettingSlider,
} from "@/features/settings/components/settings-ui"
import { useProjectSettingsViewModel } from "@/features/projects/model/use-project-settings-viewmodel"
import { useCloudStorageViewModel } from "@/shared/model/cloud-storage-viewmodel"
import type { Project } from "@/shared/types/core"
import { useNavigate } from "react-router-dom"

interface ProjectSettingsTabProps {
  project: Project | null
  /** Called after any successful save so the parent can reload project state. */
  onSaved: () => void
}

export function ProjectSettingsTab({
  project,
  onSaved,
}: ProjectSettingsTabProps) {
  const navigate = useNavigate()
  const vm = useProjectSettingsViewModel({ project, onSaved })
  const { configs: cloudConnections } = useCloudStorageViewModel()
  const [confidenceDraft, setConfidenceDraft] = useState(
    vm.config.ai.defaultConfidence
  )
  const [prefixDraft, setPrefixDraft] = useState(
    vm.config.storage.prefix ?? ""
  )

  if (!project) return null

  return (
    <div className="space-y-6">
      {vm.saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>{vm.saveError}</AlertDescription>
        </Alert>
      )}

      {/* ── General ──────────────────────────────────────────────────── */}
      <SettingsSection
        icon={Save}
        title="Labeling behavior"
        description="Controls how the canvas behaves while annotating this project"
      >
        <div className="space-y-3">
          <SettingRow
            htmlFor="proj-auto-save"
            title="Auto-save annotations"
            description="Save each annotation immediately after drawing"
            control={
              <Switch
                id="proj-auto-save"
                checked={vm.config.general.autoSave}
                disabled={vm.isSaving}
                onCheckedChange={(checked) =>
                  vm.patchGeneral({ autoSave: checked })
                }
              />
            }
          />
          <SettingRow
            htmlFor="proj-snap"
            title="Snap to grid"
            description="Nudge shape vertices to the nearest grid point"
            control={
              <Switch
                id="proj-snap"
                checked={vm.config.general.snapToGrid}
                disabled={vm.isSaving}
                onCheckedChange={(checked) =>
                  vm.patchGeneral({ snapToGrid: checked })
                }
              />
            }
          />
          <SettingRow
            title="Label display"
            description="What appears on annotations in the canvas"
          >
            <Select
              value={vm.config.general.labelDisplayMode}
              disabled={vm.isSaving}
              onValueChange={(v) =>
                vm.patchGeneral({
                  labelDisplayMode: v as "name" | "color" | "both",
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name only</SelectItem>
                <SelectItem value="color">Color only</SelectItem>
                <SelectItem value="both">Name + color</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </SettingsSection>

      {/* ── Export ───────────────────────────────────────────────────── */}
      <SettingsSection
        icon={Download}
        title="Export defaults"
        description="Default options used when exporting this project's annotations"
      >
        <div className="space-y-3">
          <SettingRow
            title="Default format"
            description="Format pre-selected when you open the export dialog"
          >
            <Select
              value={vm.config.export.defaultFormat}
              disabled={vm.isSaving}
              onValueChange={(v) =>
                vm.patchExport({
                  defaultFormat: v as "yolo" | "coco" | "labelme" | "csv",
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yolo">YOLO</SelectItem>
                <SelectItem value="coco">COCO JSON</SelectItem>
                <SelectItem value="labelme">LabelMe JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow
            htmlFor="proj-include-images"
            title="Include items in export"
            description="Copy the source images alongside the annotation files"
            control={
              <Switch
                id="proj-include-images"
                checked={vm.config.export.includeImages}
                disabled={vm.isSaving}
                onCheckedChange={(checked) =>
                  vm.patchExport({ includeImages: checked })
                }
              />
            }
          />
          <SettingRow
            htmlFor="proj-normalize"
            title="Normalize coordinates"
            description="Export box/polygon values as 0–1 fractions of image size"
            control={
              <Switch
                id="proj-normalize"
                checked={vm.config.export.normalizeCoordinates}
                disabled={vm.isSaving}
                onCheckedChange={(checked) =>
                  vm.patchExport({ normalizeCoordinates: checked })
                }
              />
            }
          />
        </div>
      </SettingsSection>

      {/* ── AI defaults ──────────────────────────────────────────────── */}
      <SettingsSection
        icon={Bot}
        title="AI defaults"
        description="Auto-label and copilot settings specific to this project"
      >
        <div className="space-y-4">
          <SettingSlider
            title="Default confidence threshold"
            value={Math.round(confidenceDraft * 100)}
            unit="%"
          >
            <Slider
              min={5}
              max={95}
              step={5}
              value={[Math.round(confidenceDraft * 100)]}
              disabled={vm.isSaving}
              onValueChange={(v) => {
                const val = Array.isArray(v) ? v[0] : v
                setConfidenceDraft((val as number) / 100)
              }}
              onValueCommitted={(v) => {
                const val = Array.isArray(v) ? v[0] : v
                void vm.patchAi({ defaultConfidence: (val as number) / 100 })
              }}
            />
          </SettingSlider>

          <SettingRow
            htmlFor="proj-copilot"
            title="Enable AI copilot"
            description="Show the copilot panel in the annotation sidebar for this project"
            control={
              <Switch
                id="proj-copilot"
                checked={vm.config.ai.copilotEnabled}
                disabled={vm.isSaving}
                onCheckedChange={(checked) =>
                  vm.patchAi({ copilotEnabled: checked })
                }
              />
            }
          />

          <SettingRow
            title="Copilot vision"
            description="Whether the copilot sends the current image for visual context"
          >
            <Select
              value={vm.config.ai.copilotVision}
              disabled={vm.isSaving}
              onValueChange={(v) =>
                vm.patchAi({ copilotVision: v as "auto" | "on" | "off" })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="on">Always on</SelectItem>
                <SelectItem value="off">Always off</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </SettingsSection>

      {/* ── Cloud storage ────────────────────────────────────────────── */}
      <SettingsSection
        icon={Cloud}
        title="Cloud storage"
        description="Per-project connection and path prefix. Overrides the globally active connection for Push / Pull on this project."
      >
        <div className="space-y-3">
          <SettingRow
            title="Connection"
            description={
              cloudConnections.length === 0
                ? "No cloud connections configured — add one in Settings → Cloud Storage."
                : "Which cloud account to use for this project's Push and Pull operations."
            }
          >
            <Select
              value={vm.config.storage.connectionId ?? "__none__"}
              disabled={vm.isSaving || cloudConnections.length === 0}
              onValueChange={(v) =>
                vm.patchStorage({
                  connectionId: !v || v === "__none__" ? undefined : v,
                })
              }
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Local only" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Local only</SelectItem>
                {cloudConnections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.name}
                    <span className="ml-1.5 text-xs uppercase text-muted-foreground">
                      {conn.provider}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {vm.config.storage.connectionId && (
            <SettingRow
              title="Path prefix"
              description={`Object-key prefix inside the bucket. Leave blank to use the default: projects/${project?.id ?? "..."}/images/`}
            >
              <Input
                className="w-72 font-mono text-xs"
                placeholder={`projects/${project?.id ?? "..."}/images/`}
                value={prefixDraft}
                onChange={(e) => setPrefixDraft(e.target.value)}
                onBlur={() =>
                  vm.patchStorage({
                    prefix: prefixDraft.trim() || undefined,
                  })
                }
              />
            </SettingRow>
          )}
        </div>
      </SettingsSection>

      {/* ── Danger zone ──────────────────────────────────────────────── */}
      <SettingsSection
        icon={AlertTriangle}
        title="Danger zone"
        description="Irreversible actions for this project"
      >
        <div className="space-y-3">
          <SettingRow
            title="Delete project"
            description="Permanently deletes the project, all items, and all annotations. Cannot be undone."
            control={
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={vm.isDeleting}
                      className="gap-1.5"
                    >
                      <Trash2 className="size-4" />
                      Delete project
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the project, all of its
                      images, and every annotation. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await vm.deleteProject()
                        navigate("/projects")
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            }
          />
        </div>
      </SettingsSection>
    </div>
  )
}
