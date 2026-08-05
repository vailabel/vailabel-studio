import { Database, Layers, ShieldCheck, Tag } from "lucide-react"
import type { DatasetAnalytics } from "@/shared/types/dataset-intelligence"
import { StatCard } from "./stat-card"
import { ClassDistributionPanel } from "./analytics/class-distribution-panel"
import { CompositionPanel } from "./analytics/composition-panel"
import { LabelUsagePanel } from "./analytics/label-usage-panel"
import { ResolutionPanel } from "./analytics/resolution-panel"

export function AnalyticsTab({ analytics }: { analytics: DatasetAnalytics }) {
  const { datasetStats: stats, resolutionStats } = analytics

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Database} label="Items" value={stats.totalItems} />
        <StatCard
          icon={ShieldCheck}
          label="Annotated"
          value={`${stats.annotatedPercentage.toFixed(0)}%`}
          hint={`${stats.annotatedImages}/${stats.totalItems}`}
        />
        <StatCard
          icon={Layers}
          label="Annotations"
          value={stats.totalAnnotations}
          hint={`avg ${stats.meanAnnotationsPerImage.toFixed(1)}/img`}
        />
        <StatCard icon={Tag} label="Unannotated" value={stats.unannotatedImages} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClassDistributionPanel classDistribution={analytics.classDistribution} />
        <LabelUsagePanel labels={analytics.labelDistribution} />
        <ResolutionPanel stats={resolutionStats} />
        <CompositionPanel
          annotationTypes={stats.annotationTypes}
          aspectBuckets={resolutionStats.aspectBuckets}
        />
      </div>
    </>
  )
}
