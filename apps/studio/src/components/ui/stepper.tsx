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
    <div className={cn("flex items-center justify-center gap-4 md:gap-8 py-8 px-4", className)}>
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-2 md:gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ 
              scale: idx <= currentStep ? 1.05 : 1,
              opacity: 1 
            }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="flex items-center gap-2 md:gap-4"
          >
            <motion.span
              className={cn(
                "flex items-center justify-center rounded-full border-2 w-10 h-10 md:w-12 md:h-12 text-sm md:text-base font-bold transition-all duration-300 relative overflow-hidden",
                idx < currentStep
                  ? "border-primary bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                  : idx === currentStep
                    ? "border-primary text-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/10"
                    : "border-gray-300 text-gray-400 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-600"
              )}
            >
              {idx < currentStep ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                </motion.div>
              ) : (
                <motion.span
                  className={cn(
                    "font-semibold",
                    idx === currentStep ? "text-primary" : "text-gray-400"
                  )}
                >
                  {idx + 1}
                </motion.span>
              )}
              
              {/* Animated background for current step */}
              {idx === currentStep && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.span>
            
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  "text-sm md:text-base font-semibold transition-colors duration-300 whitespace-nowrap",
                  idx <= currentStep
                    ? "text-foreground"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {step.description}
                </span>
              )}
            </div>
          </motion.div>
          
          {idx < steps.length - 1 && (
            <motion.div 
              className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 mx-2 relative overflow-hidden"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: idx < currentStep ? 1 : 0.3 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              {idx < currentStep && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              )}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
})

Stepper.displayName = "Stepper"
