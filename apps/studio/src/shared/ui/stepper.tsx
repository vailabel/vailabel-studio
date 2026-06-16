import { memo } from "react"
import { CheckCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export const Stepper = memo(({ steps, currentStep, className }: StepperProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-4 md:gap-8 py-8 px-4", className)}>
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-2 md:gap-4">
          <div
            className="flex items-center gap-2 md:gap-4 animate-in zoom-in-95 fade-in duration-300 fill-mode-both"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full border-2 w-10 h-10 md:w-12 md:h-12 text-sm md:text-base font-bold transition-transform duration-300 relative overflow-hidden",
                idx <= currentStep ? "scale-105" : "scale-100",
                idx < currentStep
                  ? "border-primary bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                  : idx === currentStep
                    ? "border-primary text-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/10"
                    : "border-input text-muted-foreground bg-muted/50"
              )}
            >
              {idx < currentStep ? (
                <div
                  className="animate-check-pop fill-mode-both"
                  style={{ animationDelay: "100ms" }}
                >
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              ) : (
                <span
                  className={cn(
                    "font-semibold",
                    idx === currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </span>
              )}

              {/* Animated background for current step */}
              {idx === currentStep && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-shimmer" />
              )}
            </span>

            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  "text-sm md:text-base font-semibold transition-colors duration-300 whitespace-nowrap",
                  idx <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                  {step.description}
                </span>
              )}
            </div>
          </div>

          {idx < steps.length - 1 && (
            <div
              className="hidden md:block w-12 h-0.5 bg-border mx-2 relative overflow-hidden origin-left transition-transform duration-300"
              style={{
                transform: `scaleX(${idx < currentStep ? 1 : 0.3})`,
                transitionDelay: `${idx * 100}ms`,
              }}
            >
              {idx < currentStep && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 animate-shimmer fill-mode-both"
                  style={{
                    animationDelay: "200ms",
                    animationDuration: "0.5s",
                    animationIterationCount: 1,
                    animationTimingFunction: "ease-out",
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

Stepper.displayName = "Stepper"
