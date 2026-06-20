import { data } from "@/app/data"

const SITE = data.productionUrl.replace(/\/$/, "")
const abs = (path: string) => (path.startsWith("http") ? path : `${SITE}${path.startsWith("/") ? "" : "/"}${path}`)

/** Organization — used for knowledge-panel / brand entity. */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: data.orgName,
  url: `${SITE}/`,
  logo: abs(data.appLogo),
  sameAs: [data.repoUrl, data.discordUrl],
}

/** WebSite entity for the whole site. */
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  name: data.appName,
  url: `${SITE}/`,
  description: data.appDescription,
  inLanguage: "en",
  publisher: { "@id": `${SITE}/#organization` },
}

/** SoftwareApplication — the strongest signal for an app landing page. */
export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE}/#software`,
  name: data.appName,
  alternateName: "Vailabel data labeling studio",
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "Data labeling & annotation tool",
  operatingSystem: "Windows, macOS, Linux",
  url: `${SITE}/`,
  description: data.appDescription,
  downloadUrl: data.releasesUrl,
  softwareHelp: `${SITE}/docs/getting-started`,
  license: data.licenseUrl,
  isAccessibleForFree: true,
  inLanguage: "en",
  featureList: [
    "Bounding box, polygon, point, line, circle and free-draw annotation",
    "SAM smart-segmentation",
    "Offline AI copilot for detection, segmentation and QA",
    "Image, video, text, audio and multi-modal labeling",
    "Export to COCO, YOLO, YOLO-Seg, Pascal VOC and LabelMe",
    "Local-first storage — data never leaves your machine",
    "Bring your own cloud (S3, Azure Blob, Google Cloud Storage)",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: { "@id": `${SITE}/#organization` },
  publisher: { "@id": `${SITE}/#organization` },
}

type Faq = { question: string; answer: string }

export function faqPageSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  }
}

export function articleSchema(opts: {
  type?: "BlogPosting" | "TechArticle"
  title: string
  description?: string
  path: string
  image?: string
  datePublished?: string
  dateModified?: string
  author?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": opts.type ?? "BlogPosting",
    headline: opts.title,
    description: opts.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": abs(opts.path) },
    url: abs(opts.path),
    image: opts.image ? abs(opts.image) : abs("/opengraph-image"),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: { "@type": "Person", name: opts.author ?? data.authorName },
    publisher: { "@id": `${SITE}/#organization` },
  }
}
