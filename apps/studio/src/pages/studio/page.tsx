"use client" // important for client-side hooks like useMemo

import { memo, useMemo } from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"

// Client-only dynamic import
const MemoizedImageLabeler = dynamic(
  () => import("@/components/image-labeler").then(mod => mod.ImageLabeler),
  { ssr: false }
)

export default function ImageStudio() {
  const params = useParams()
  const { projectId, imageId } = params

  // Memoize props to avoid unnecessary re-renders
  const labelerProps = useMemo(
    () => ({
      projectId,
      imageId,
    }),
    [projectId, imageId]
  )

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Homepage image */}
      <img
        src="/homepage-image.jpeg"
        alt="Studio Homepage"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.9)",
          animation: "fadeIn 1.5s ease-in-out",
        }}
      />

      {/* Original ImageLabeler */}
      <MemoizedImageLabeler {...labelerProps} />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
