import { useState } from "react"
import {
  Bot,
  Check,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Play,
  Save,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { SettingsSection } from "@/features/settings/components/settings-ui"
import { useCopilotSettings } from "@/features/settings/model/copilot-settings-viewmodel"
import type { CopilotConfig, CopilotVisionPref } from "@/shared/types/ai-assistant"

/** Known local servers. Picking one fills the base URL; "auto" clears it so the
 *  backend probes the defaults; "custom" leaves whatever the user typed. */
const SERVER_PRESETS: { id: string; name: string; baseUrl: string }[] = [
  { id: "auto", name: "Auto-detect (recommended)", baseUrl: "" },
  { id: "lmstudio", name: "LM Studio", baseUrl: "http://localhost:1234/v1" },
  { id: "ollama", name: "Ollama", baseUrl: "http://localhost:11434/v1" },
  { id: "llamacpp", name: "llama.cpp", baseUrl: "http://localhost:8080/v1" },
  { id: "jan", name: "Jan", baseUrl: "http://localhost:1337/v1" },
  { id: "custom", name: "Custom server", baseUrl: "" },
]

const VISION_OPTIONS: { value: CopilotVisionPref; label: string }[] = [
  { value: "auto", label: "Auto — detect from the model" },
  { value: "on", label: "Always send the image" },
  { value: "off", label: "Text only — never send images" },
]

export default function CopilotSettings() {
  const { config, hasStoredKey, isLoading, isSaving, save, testConnection } =
    useCopilotSettings()

  const [form, setForm] = useState<CopilotConfig>(config)
  const [hydratedFrom, setHydratedFrom] = useState(config)
  const [apiKey, setApiKey] = useState("")
  const [revealKey, setRevealKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])

  // Re-seed the editable form whenever the saved config object changes (after
  // it loads, or after a save). Adjusting state during render is React's
  // recommended way to sync derived state without an effect.
  if (config !== hydratedFrom) {
    setHydratedFrom(config)
    setForm(config)
  }

  const isAuto = form.provider === "auto"

  const handleProviderChange = (id: string) => {
    const preset = SERVER_PRESETS.find((entry) => entry.id === id)
    setForm((prev) => ({
      ...prev,
      provider: id,
      // Presets set their URL; "auto" clears it; "custom" keeps the current one.
      baseUrl:
        id === "custom" ? prev.baseUrl : preset ? preset.baseUrl : prev.baseUrl,
    }))
    setDiscoveredModels([])
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await testConnection(form.baseUrl, apiKey)
      setDiscoveredModels(result.models)
      if (result.ok) {
        toast.success("Copilot server reachable", { description: result.message })
      } else {
        toast.error("Couldn't reach the server", { description: result.message })
      }
    } catch (error) {
      toast.error("Connection test failed", { description: String(error) })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      await save(form, apiKey)
      setApiKey("")
      setRevealKey(false)
      toast.success("Copilot settings saved")
    } catch (error) {
      toast.error("Failed to save settings", { description: String(error) })
    }
  }

  const handleClearKey = async () => {
    try {
      await save(form, null)
      setApiKey("")
      toast.success("API key removed")
    } catch (error) {
      toast.error("Failed to remove key", { description: String(error) })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <ShieldCheck className="h-4 w-4 text-success" />
        <AlertDescription>
          <strong className="text-foreground">Runs on your machine.</strong> The
          copilot talks to a local OpenAI-compatible server (LM Studio, Ollama,
          llama.cpp). Any API key is stored encrypted in your system keychain —
          never in plain settings.
        </AlertDescription>
      </Alert>

      <SettingsSection
        icon={Server}
        title="Local model server"
        description="Point the copilot at the on-device server that runs its chat and vision replies."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Server</Label>
            <Select value={form.provider} onValueChange={(v) => v !== null && handleProviderChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVER_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAuto ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The copilot will probe the common local servers (ports 1234,
                11434, 8080, 1337) and pick a loaded model automatically. Choose a
                specific server above to pin a URL and model.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="copilot-base-url">Server URL</Label>
                <Input
                  id="copilot-base-url"
                  value={form.baseUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                  }
                  placeholder="http://localhost:1234/v1"
                />
                <p className="text-xs text-muted-foreground">
                  A bare host, a <code>/v1</code> base, or a full chat endpoint —
                  all work.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copilot-model">Model</Label>
                <Input
                  id="copilot-model"
                  value={form.model}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, model: event.target.value }))
                  }
                  placeholder="Leave blank to use the server's loaded model"
                />
                {discoveredModels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {discoveredModels.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, model }))
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                        title={`Use ${model}`}
                      >
                        {form.model === model && <Check className="h-3 w-3" />}
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Vision</Label>
                <Select
                  value={form.vision}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      vision: value as CopilotVisionPref,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="copilot-api-key">
                  API key{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="copilot-api-key"
                    type={revealKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={
                      hasStoredKey ? "•••••••• (stored)" : "Most local servers need none"
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-9 text-muted-foreground"
                    onClick={() => setRevealKey((prev) => !prev)}
                    aria-label={revealKey ? "Hide" : "Show"}
                  >
                    {revealKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {hasStoredKey && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" />
                      Key stored
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive"
                      onClick={() => void handleClearKey()}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            {!isAuto && (
              <Button
                variant="outline"
                onClick={() => void handleTest()}
                disabled={testing || !form.baseUrl.trim()}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Test connection
              </Button>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Bot}
        title="How the copilot uses this"
        description="Detection and segmentation always run on-device; the model below only handles chat and image descriptions."
      >
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            Grounding (detect / find / QA review) runs on your local detector — it
            never depends on this server.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            A vision-capable model lets the copilot describe images and suggest
            labels; a text-only model still handles chat.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            With no server reachable, the copilot falls back to detector-only
            replies — nothing breaks.
          </li>
        </ul>
      </SettingsSection>
    </div>
  )
}
