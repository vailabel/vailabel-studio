import UpdatesPage from "./update-client-page"

export const metadata = {
  title: "Updates",
  description:
    "Release notes and changelog for Vailabel Studio — new annotation features, AI copilot improvements, and fixes.",
  alternates: { canonical: "/updates" },
  openGraph: {
    title: "Vailabel Studio Updates",
    description:
      "Release notes and changelog for Vailabel Studio.",
    url: "/updates",
    type: "website",
  },
}

export default async function Updates() {
  return <UpdatesPage />
}
