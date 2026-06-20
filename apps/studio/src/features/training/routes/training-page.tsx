import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Loader2,
  Play,
  Sliders,
  Wand2,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { useStartTraining } from "@/shared/model/ai-runtime-viewmodel"
import { AugmentationControls } from "@/shared/components/training/augmentation-controls"
import { AugmentationPreview } from "@/features/training/components/augmentation-preview"
import {
  AUG_PRESETS,
  FAMILIES,
  PRESETS,
  type AugKey,
  type Augmentation,
  type PresetKey,
} from "@/shared/components/training/training-config"
import { projectsService } from "@/shared/services/projects-service"
import { itemsService } from "@/shared/services/images-service"
import { toAssetUrl } from "@/shared/lib/desktop"
import type { DatasetExportResult } from "@/shared/types/ai-runtime"

/**
 * Full-page training experience (Roboflow-style): configure the model, duration,
 * and augmentation on the left while a live preview on the right shows what each
 * augmentation does to a real sample from the project. Starting exports the
 * project's annotations to a YOLO dataset and launches a run in the embedded
 * runtime. Reached at /projects/train/:projectId.
 */
export default function TrainingPage() {
  const { projectId = "" } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState("")
  const [sampleUrl, setSampleUrl] = useState<string | null>(null)

  const [family, setFamily] = useState("yolo")
  const [name, setName] = useState("")
  const [preset, setPreset] = useState<PresetKey>("balanced")
  const [epochs, setEpochs] = useState(String(PRESETS.balanced.epochs))
  const [imgsz, setImgsz] = useState(String(PRESETS.balanced.imgsz))
  const [augPreset, setAugPreset] = useState<AugKey | "custom">("standard")
  const [aug, setAug] = useState<Augmentation>(AUG_PRESETS.standard.values)
  const [result, setResult] = useState<DatasetExportResult | null>(null)

  const { start, busy, error } = useStartTraining()

  // Load the project name + a real sample image to drive the live preview.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    void (async () => {
      try {
        const project = await projectsService.getById(projectId)
        if (cancelled) return
        setProjectName(project?.name ?? "")
        if ((project?.modality ?? "image") !== "image") return
        const items = await itemsService.getItemRange(projectId, 0, 12)
        if (cancelled) return
        const withPath = items.find((it) => it.path)
        if (withPath?.path) setSampleUrl(toAssetUrl(withPath.path))
      } catch {
        // Non-fatal — the preview just shows its empty state.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

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

  const backToProject = () => navigate(`/projects/detail/${projectId}`)

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
    if (summary) setResult(summary)
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={backToProject}
          className="-ml-2 w-fit gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          {projectName || "Project"}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Train a model</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure the model and augmentation, preview what the model will see,
            then start a run. Augmentations are applied on the fly during
            training — no extra images on disk.
          </p>
        </div>
      </div>

      {result ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-9 text-success" />
            <div className="space-y-1">
              <p className="font-semibold">Training started</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Exported {result.labeledCount}/{result.itemCount} labeled images
                ({result.trainCount} train · {result.valCount} val),{" "}
                {result.annotationCount} boxes across {result.classCount} classes.
                Track progress on the project&apos;s Model tab.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={backToProject}>Back to project</Button>
              <Button variant="outline" onClick={() => setResult(null)}>
                Train another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          {/* Config */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="size-4.5 text-muted-foreground" />
                  Model
                </CardTitle>
                <CardDescription>
                  Which architecture to train, and an optional run name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Architecture</Label>
                  <Select
                    value={family}
                    onValueChange={(v) => v !== null && setFamily(v)}
                  >
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sliders className="size-4.5 text-muted-foreground" />
                  Training duration
                </CardTitle>
                <CardDescription>
                  Longer training is usually more accurate but slower.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Preset</Label>
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
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="size-4.5 text-muted-foreground" />
                  Data augmentation
                </CardTitle>
                <CardDescription>
                  Synthetic variety that helps the model generalize. Watch the
                  preview update as you adjust each one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AugmentationControls
                  aug={aug}
                  augPreset={augPreset}
                  onPreset={applyAugPreset}
                  onField={setAugField}
                  defaultOpen
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview + start (sticky on large screens) */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  A real sample with the current augmentation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AugmentationPreview sampleUrl={sampleUrl} aug={aug} />
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={busy || !projectId}
              onClick={submit}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {busy ? "Exporting & starting…" : "Start training"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="rounded-md border border-warning/20 bg-warning/10 p-2.5 text-xs text-muted-foreground">
              Real training needs the AI runtime&apos;s training backend
              (Ultralytics). Without it the run is simulated and won&apos;t
              produce a usable model.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
