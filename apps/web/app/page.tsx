import HeroSection from "@/components/HeroSection"
import FeatureHighlights from "@/components/FeatureHighlights"
import DocumentationBlog from "@/components/DocumentationBlog"
import DemoSection from "@/components/DemoSection"
import RoadmapSection from "@/components/RoadmapSection"
import CTASection from "@/components/CTASection"

export const metadata = {
  title: "VAI Labeling - Smart Image Annotation Platform",
  description:
    "Empowering the future of AI with open-source, collaborative, and smart image annotation tools. Try demos, read documentation, and join our roadmap!",
  openGraph: {
    title: "VAI Labeling - Smart Image Annotation Platform",
    description:
      "Empowering the future of AI with open-source, collaborative, and smart image annotation tools. Try demos, read documentation, and join our roadmap!",
    url: "https://vailabel.com",
    siteName: "VAI Labeling",
    images: [
      {
        url: "https://vailabel.com/logo.png",
        width: 1200,
        height: 630,
        alt: "VAI Labeling - Smart Image Annotation Platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VAI Labeling - Smart Image Annotation Platform",
    description:
      "Empowering the future of AI with open-source, collaborative, and smart image annotation tools.",
  },
}

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
