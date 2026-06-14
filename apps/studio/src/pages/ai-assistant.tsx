import { Sparkles } from "lucide-react"
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel"

export default function AiAssistantPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Local model registry, runtime / GPU detection, and Phase 1
            auto-labeling capabilities.
          </p>
        </div>
      </div>
      <AiAssistantPanel />
    </div>
  )
}
