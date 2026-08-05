import { Activity, CircleAlert, Tag } from "lucide-react"
import type { OutlierReport } from "@/shared/types/dataset-intelligence"
import {
  annotationRefToItem,
  outlierRefToItem,
  rareClassToItem,
} from "@/features/dataset-intelligence/model/issue-items"
import { IssueSection } from "./issue-section"

export function OutliersTab({ outliers }: { outliers: OutlierReport }) {
  return (
    <>
      <IssueSection
        icon={Activity}
        tone="info"
        title="Embedding outliers"
        subtitle="Images far from the dataset feature centroid"
        items={outliers.embeddingOutliers.map(outlierRefToItem)}
      />
      <IssueSection
        icon={Tag}
        tone="info"
        title="Rare classes"
        subtitle="Classes with very few annotations"
        items={outliers.rareClasses.map(rareClassToItem)}
      />
      <IssueSection
        icon={CircleAlert}
        tone="warning"
        title="Suspicious labels"
        subtitle="Tiny or out-of-bounds boxes"
        items={outliers.suspiciousLabels.map(annotationRefToItem)}
      />
    </>
  )
}

