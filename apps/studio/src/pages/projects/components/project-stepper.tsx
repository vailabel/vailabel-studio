import { CheckCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface Step {
  label: string
  description?: string
}

interface ProjectStepperProps {
  steps: Step[]
  currentStep: number
}

export function ProjectStepper({ steps, currentStep }: ProjectStepperProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center rounded-full border-2 w-10 h-10 text-sm font-semibold ${
              idx < currentStep
                ? "border-primary bg-primary text-primary-foreground"
                : idx === currentStep
                  ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
            }`}
          >
            {idx < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span>{idx + 1}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span
              className={`text-sm font-semibold ${
                idx <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {step.description && (
              <span className="text-xs text-muted-foreground">
                {step.description}
              </span>
            )}
          </div>
          {idx < steps.length - 1 && <Separator orientation="vertical" />}
        </div>
      ))}
    </div>
  )
}
