import { Brain, Cpu } from "lucide-react"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { AiRuntimePanel } from "@/features/ai-models/components/ai-runtime-panel"
import { RuntimeModelLibrary } from "@/features/ai-models/components/runtime-model-library"

/**
 * AI Assistant page. All AI compute now runs in the embedded Python runtime, so
 * this page surfaces that runtime's health + its model catalog rather than the
 * old ONNX model-management UI (import / GitHub packs / ORT installer).
 */
export default function AIModelListPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Brain className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Local AI runs in an embedded Python runtime — no setup, fully offline.
          </p>
        </div>
      </div>

      <AiRuntimePanel />

      <Alert>
        <Cpu className="size-4" />
        <AlertDescription>
          Models download automatically the first time they're used. The copilot
          and the canvas auto-label tools draw on the models below.
        </AlertDescription>
      </Alert>

      <RuntimeModelLibrary />
    </div>
  )
}
