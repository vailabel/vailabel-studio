"use client"

import { motion, AnimatePresence } from "framer-motion"
import { labelingTools } from "./hero/hero-tools"
import { useToolAnimation } from "./hero/use-tool-animation"
import { HeroIntro } from "./hero/hero-intro"
import { ToolSelector } from "./hero/tool-selector"
import { LabelingCanvas } from "./hero/labeling-canvas"

const HeroSection = () => {
  const { activeToolIndex, setActiveToolIndex, controls } = useToolAnimation()

  return (
    <section className="relative py-20 md:py-28 overflow-hidden" id="download">
      <div className="cloud-aurora" aria-hidden="true" />
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <HeroIntro />

          {/* Labeling Tools Showcase */}
          <ToolSelector
            tools={labelingTools}
            activeIndex={activeToolIndex}
            onSelect={setActiveToolIndex}
          />

          {/* Active Tool Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeToolIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-10 mb-5"
            >
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {labelingTools[activeToolIndex].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Hero Image with Animated Labeling Overlay */}
          <LabelingCanvas
            tools={labelingTools}
            activeIndex={activeToolIndex}
            onSelect={setActiveToolIndex}
            controls={controls}
          />
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection
