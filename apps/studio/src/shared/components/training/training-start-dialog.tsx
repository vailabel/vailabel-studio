import { useEffect, useState, type ReactElement } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Loader2, Play, Wand2 } from "lucide-react"
import { projectsService } from "@/shared/services/projects-service"
import { useStartTraining } from "@/shared/model/ai-runtime-viewmodel"
import { AugmentationControls } from "@/shared/components/training/augmentation-controls"
import {
  AUG_PRESETS,
  FAMILIES,
  PRESETS,
  type AugKey,
  type Augmentation,
  type PresetKey,
} from "@/shared/components/training/training-config"
import type { Project } from "@/shared/types/core"
import type { DatasetExportResult } from "@/shared/types/ai-runtime"

/**
 * Quick "new training job" dialog: pick a project + model + hyperparameters +
 * augmentation, then the project's annotations are exported to a YOLO dataset
 * and a run starts in the embedded runtime. The full-page training experience
 * (with live augmentation previews) lives at /projects/train/:projectId; this
 * dialog is the compact alternative. Renders `trigger` as the opener.
 */
export function TrainingStartDialog({
  trigger,
  projectId: fixedProjectId,
  onStarted,
}: {
  trigger: ReactElement
  /** When set, the dialog trains this project (no project picker shown). */
  projectId?: string
  onStarted?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(
    fixedProjectId ?? ""
  )
  const projectId = fixedProjectId ?? selectedProjectId
  const [family, setFamily] = useState("yolo")
  const [name, setName] = useState("")
  const [preset, setPreset] = useState<PresetKey>("balanced")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [epochs, setEpochs] = useState(String(PRESETS.balanced.epochs))
  const [imgsz, setImgsz] = useState(String(PRESETS.balanced.imgsz))
  const [augPreset, setAugPreset] = useState<AugKey | "custom">("standard")
  const [aug, setAug] = useState<Augmentation>(AUG_PRESETS.standard.values)
  const [result, setResult] = useState<DatasetExportResult | null>(null)

  // Picking a preset fills the hyperparameters; editing them flips to "custom".
  const applyPreset = (key: PresetKey) => {
    setPreset(key)
    if (key !== "custom") {
      setEpochs(String(PRESETS[key].epochs))
      setImgsz(String(PRESETS[key].imgsz))
    }
  }

  const applyAugPreset = (key: AugKey) => {
    setAugPreset(key)
    setAug(AUG_PRESETS[key].values)
  }
  const setAugField = (field: keyof Augmentation, value: number) => {
    setAug((prev) => ({ ...prev, [field]: value }))
    setAugPreset("custom")
  }

  const { start, busy, error, clearError } = useStartTraining()

  // Load the project list only when the dialog isn't already scoped to one.
  useEffect(() => {
    if (!open || fixedProjectId) return
    void projectsService
      .list()
      .then((rows) => {
        setProjects(rows)
        setSelectedProjectId((prev) => prev || rows[0]?.id || "")
      })
      .catch(() => setProjects([]))
  }, [open, fixedProjectId])

  const reset = () => {
    setResult(null)
    clearError()
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const submit = async () => {
    if (!projectId) return
    const summary = await start({
      projectId,
      modelFamily: family,
      name: name.trim() || undefined,
      epochs: Number(epochs) || undefined,
      imgsz: Number(imgsz) || undefined,
      augmentation: { ...aug } as Record<string, number>,
    })
    if (summary) {
      setResult(summary)
      onStarted?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New training job</DialogTitle>
          <DialogDescription>
            Exports this project&apos;s annotations to a YOLO dataset, then trains
            in the embedded runtime. Progress shows below once it starts.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Training started.</p>
            <p className="text-muted-foreground">
              Exported {result.labeledCount}/{result.itemCount} labeled images
              ({result.trainCount} train · {result.valCount} val),{" "}
              {result.annotationCount} boxes across {result.classCount} classes.
            </p>
            {result.warnings.length > 0 && (
              <ul className="max-h-28 list-disc overflow-auto rounded-md border bg-muted/30 p-3 pl-6 text-xs text-muted-foreground">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!fixedProjectId && (
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => v !== null && setSelectedProjectId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={family} onValueChange={(v) => v !== null && setFamily(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAMILIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-name">Name (optional)</Label>
              <Input
                id="job-name"
                value={name}
                placeholder={`${family} training`}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Training preset</Label>
              <Select
                value={preset}
                onValueChange={(v) => applyPreset(v as PresetKey)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PRESETS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PRESETS[preset].hint}
                {preset !== "custom" && ` (${epochs} epochs · ${imgsz}px)`}
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {showAdvanced ? "Hide advanced" : "Advanced settings"}
              </button>
              {showAdvanced && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="epochs">Epochs</Label>
                    <Input
                      id="epochs"
                      type="number"
                      min={1}
                      value={epochs}
                      onChange={(e) => {
                        setEpochs(e.target.value)
                        setPreset("custom")
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imgsz">Image size</Label>
                    <Input
                      id="imgsz"
                      type="number"
                      min={32}
                      step={32}
                      value={imgsz}
                      onChange={(e) => {
                        setImgsz(e.target.value)
                        setPreset("custom")
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
                Data augmentation
              </Label>
              <AugmentationControls
                aug={aug}
                augPreset={augPreset}
                onPreset={applyAugPreset}
                onField={setAugField}
              />
            </div>

            <p className="rounded-md border border-warning/20 bg-warning/10 p-2.5 text-xs text-muted-foreground">
              Real training needs the AI runtime&apos;s training backend
              (Ultralytics). Without it the run is simulated and won&apos;t
              produce a usable model.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button className="gap-2" disabled={busy || !projectId} onClick={submit}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {busy ? "Exporting & starting…" : "Start training"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
