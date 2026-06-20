import type { Metadata } from "next"
import HeroSection from "@/components/hero-section"
import FeatureHighlights from "@/components/feature-highlights"
import AiCopilotSection from "@/components/ai-copilot-section"
import WorkflowSection from "@/components/workflow-section"
import DemoSection from "@/components/demo-section"
import RoadmapSection from "@/components/roadmap-section"
import CTASection from "@/components/cta-section"
import FaqSection, { faqs } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { data } from "@/app/data"
import {
  faqPageSchema,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/app/structured-data"

const title = `${data.appName} — ${data.tagline}`

export const metadata: Metadata = {
  // Home owns the canonical root; use an absolute title so the brand suffix isn't doubled.
  title: { absolute: title },
  description: data.appDescription,
  alternates: { canonical: "/" },
}

export default function Home() {
  return (
    <main className="bg-background">
      <JsonLd
        data={[
          organizationSchema,
          websiteSchema,
          softwareApplicationSchema,
          faqPageSchema(faqs),
        ]}
      />
      <HeroSection />
      <FeatureHighlights />
      <AiCopilotSection />
      <WorkflowSection />
      <DemoSection />
      <RoadmapSection />
      <FaqSection />
      <CTASection />
    </main>
  )
}
