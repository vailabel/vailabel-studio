import HeroSection from "@/components/hero-section"
import FeatureHighlights from "@/components/feature-highlights"
import AiCopilotSection from "@/components/ai-copilot-section"
import WorkflowSection from "@/components/workflow-section"
import DemoSection from "@/components/demo-section"
import RoadmapSection from "@/components/roadmap-section"
import CTASection from "@/components/cta-section"
import { data } from "@/app/data"

const title = `${data.appName} — Local-first data labeling with an offline AI copilot`
const description = data.appDescription

export const metadata = {
  title,
  description,
  metadataBase: new URL(data.productionUrl),
  openGraph: {
    title,
    description,
    url: data.productionUrl,
    siteName: data.appName,
    images: [
      {
        url: data.appLogo,
        width: 1200,
        height: 630,
        alt: data.appName,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
}

export default function Home() {
  return (
    <main className="bg-background">
      <HeroSection />
      <FeatureHighlights />
      <AiCopilotSection />
      <WorkflowSection />
      <DemoSection />
      <RoadmapSection />
      <CTASection />
    </main>
  )
}
