"use client"
import { motion, useScroll } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  className?: string
}

export function ProgressBar({ className }: ProgressBarProps) {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      className={cn(
        "fixed top-0 left-0 right-0 h-1 z-50 origin-left",
        className
      )}
      style={{ scaleX: scrollYProgress }}
    />
  )
}
