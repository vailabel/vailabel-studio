"use client"

import HeroSection from "@/components/HeroSection"
import FeatureHighlights from "@/components/FeatureHighlights"
import DocumentationBlog from "@/components/DocumentationBlog"
import DemoSection from "@/components/DemoSection"
import RoadmapSection from "@/components/RoadmapSection"
import CTASection from "@/components/CTASection"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <main>
        <HeroSection />
        <FeatureHighlights />
        <DocumentationBlog />
        <DemoSection />
        <RoadmapSection />
        <CTASection />
      </main>
    </div>
  )
}
