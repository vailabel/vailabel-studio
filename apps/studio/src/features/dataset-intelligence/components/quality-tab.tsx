import { FileWarning, ImageOff, Tag } from "lucide-react"
import type { QualityValidation } from "@/shared/types/dataset-intelligence"
import {
  annotationRefToItem,
  imageRefToItem,
} from "@/features/dataset-intelligence/model/issue-items"
import { IssueSection } from "./issue-section"

export function QualityTab({ quality }: { quality: QualityValidation }) {
  return (
    <>
      <IssueSection
        icon={Tag}
        tone="warning"
        title="Missing labels"
        subtitle="Items with no annotations"
        items={quality.missingLabels.map(imageRefToItem)}
      />
      <IssueSection
        icon={FileWarning}
        tone="error"
        title="Empty annotations"
        subtitle="Annotations with no usable geometry"
        items={quality.emptyAnnotations.map(annotationRefToItem)}
      />
      <IssueSection
        icon={FileWarning}
        tone="error"
        title="Invalid polygons"
        subtitle="Too few points, zero area, or self-intersecting"
        items={quality.invalidPolygons.map(annotationRefToItem)}
      />
      <IssueSection
        icon={ImageOff}
        tone="error"
        title="Corrupted images"
        subtitle="Files that could not be decoded"
        items={quality.corruptedImages.map(imageRefToItem)}
      />
    </>
  )
}

