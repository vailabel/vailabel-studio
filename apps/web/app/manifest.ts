import type { MetadataRoute } from "next"
import { data } from "@/app/data"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${data.appName} — ${data.tagline}`,
    short_name: data.appName,
    description: data.appDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#6366f1",
    categories: ["productivity", "developer", "utilities"],
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  }
}
