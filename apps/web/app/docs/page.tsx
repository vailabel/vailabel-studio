import DocumentationClientPage from "./documentation-client-page"

export const metadata = {
  title: "Documentation",
  description:
    "Guides and reference for Vailabel Studio — installation, annotation tools, the offline AI copilot, dataset exports (COCO, YOLO, Pascal VOC), and more.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Vailabel Studio Documentation",
    description:
      "Guides and reference for installing and using Vailabel Studio — annotation tools, the AI copilot, and dataset exports.",
    url: "/docs",
    type: "website",
  },
}

export default async function DocumentationPage() {
  return <DocumentationClientPage />
}
