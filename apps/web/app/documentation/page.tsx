import type { Metadata } from "next"
import DocumentationClientPage from "./DocumentationClientPage"

export const metadata: Metadata = {
  title: "Documentation - Vision AI Label Studio",
  description:
    "Documentation for Vision AI Label Studio - AI-Assisted Image Annotation Tool",
}

export default async function DocumentationPage() {
  // Render without the base layout by returning only the DocumentationClientPage
  return <DocumentationClientPage />
}
