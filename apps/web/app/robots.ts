import type { MetadataRoute } from "next"
import { data } from "@/app/data"

const SITE = data.productionUrl.replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
