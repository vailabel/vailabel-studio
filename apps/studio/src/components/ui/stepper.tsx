import { memo } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <div className={cn("flex items-center justify-center gap-8 py-8", className)}>
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-2">
          <motion.span
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ 
              scale: idx <= currentStep ? 1.1 : 1,
              opacity: 1 
            }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className={cn(
              "flex items-center justify-center rounded-full border-2 w-8 h-8 text-lg font-bold transition-all duration-300",
              idx < currentStep
                ? "border-primary bg-primary text-white shadow-lg"
                : idx === currentStep
                  ? "border-primary text-primary bg-primary/10 shadow-md"
                  : "border-gray-300 text-gray-400 bg-gray-100 dark:bg-gray-800"
            )}
          >
            {idx < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </motion.span>
          
          <div className="flex flex-col">
            <span
              className={cn(
                "text-sm font-medium transition-colors duration-300",
                idx <= currentStep
                  ? "text-primary"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {step.label}
            </span>
            {step.description && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {step.description}
              </span>
            )}
          </div>
          
          {idx < steps.length - 1 && (
            <motion.div 
              className="w-8 h-0.5 bg-gray-300 dark:bg-gray-700 mx-2"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: idx < currentStep ? 1 : 0.3 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            />
          )}
        </div>
      ))}
    </div>
  )
})

Stepper.displayName = "Stepper"
