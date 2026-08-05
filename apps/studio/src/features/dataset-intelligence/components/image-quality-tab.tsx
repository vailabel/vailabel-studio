import { Gauge, ImageOff, ScanSearch } from "lucide-react"
import type { ImageQualityReport } from "@/shared/types/dataset-intelligence"
import { imageQualityRefToItem } from "@/features/dataset-intelligence/model/issue-items"
import { IssueSection } from "./issue-section"
import { InlineNote } from "./dataset-states"

export function ImageQualityTab({
  imageQuality,
  analyzed,
}: {
  imageQuality: ImageQualityReport
  /** False when the report was produced with image-pixel analysis disabled. */
  analyzed: boolean
}) {
  if (!analyzed) {
    return (
      <InlineNote text="Image-pixel analysis was disabled for this report. Re-run with “Analyze image pixels” enabled." />
    )
  }

  return (
    <>
      <div className="text-sm text-muted-foreground">
        Analyzed {imageQuality.analyzed} images
        {imageQuality.skipped > 0 &&
          ` · skipped ${imageQuality.skipped} (unsupported format)`}
      </div>
      <IssueSection
        icon={ScanSearch}
        tone="warning"
        title="Blurry"
        subtitle="Low variance-of-Laplacian sharpness"
        items={imageQuality.blurry.map(imageQualityRefToItem)}
      />
      <IssueSection
        icon={Gauge}
        tone="warning"
        title="Overexposed"
        subtitle="High mean luminance / clipped highlights"
        items={imageQuality.overexposed.map(imageQualityRefToItem)}
      />
      <IssueSection
        icon={Gauge}
        tone="warning"
        title="Underexposed"
        subtitle="Low mean luminance / crushed shadows"
        items={imageQuality.underexposed.map(imageQualityRefToItem)}
      />
      <IssueSection
        icon={ImageOff}
        tone="warning"
        title="Resolution issues"
        subtitle="Too small or extreme aspect ratio"
        items={imageQuality.lowResolution.map(imageQualityRefToItem)}
      />
    </>
  )
}

