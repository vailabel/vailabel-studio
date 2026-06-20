import { ImageResponse } from "next/og"
import { data } from "@/app/data"

export const alt = `${data.appName} — ${data.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0b1020 0%, #131a36 55%, #1b2450 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            V
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
            {data.appName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 70,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            Label your data with an offline AI copilot
          </div>
          <div style={{ fontSize: 30, color: "#aab2d5", maxWidth: 940 }}>
            Local-first desktop studio for image, video & multi-modal annotation
            — detect, segment and QA on-device.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 24,
            color: "#cdd3ee",
          }}
        >
          <span>Free &amp; open source</span>
          <span>·</span>
          <span>Windows · macOS · Linux</span>
          <span>·</span>
          <span>No account required</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
