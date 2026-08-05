import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleAlert,
  Gauge,
  Info,
  Layers,
  ShieldCheck,
} from "lucide-react"
import type {
  AnalysisReport,
  ReportSummary,
} from "@/shared/types/dataset-intelligence"
import { Card } from "@/shared/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import {
  imageQualityCount,
  outlierCount,
  qualityCount,
} from "@/features/dataset-intelligence/model/finding-counts"
import { AnalyticsTab } from "./analytics-tab"
import { CountBadge } from "./count-badge"
import { HealthScoreCard, StatCard } from "./stat-card"
import { ImageQualityTab } from "./image-quality-tab"
import { OutliersTab } from "./outliers-tab"
import { QualityTab } from "./quality-tab"
import { ReportsTab } from "./reports-tab"

export function ReportView({
  report,
  reports,
  onSelectReport,
  onDeleteReport,
}: {
  report: AnalysisReport
  reports: ReportSummary[]
  onSelectReport: (id: string) => void
  onDeleteReport: (id: string) => void
}) {
  const { health, analytics, quality, imageQuality, outliers } = report

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <HealthScoreCard score={health.score} />
        <StatCard icon={CircleAlert} label="Errors" value={health.errors} tone="error" />
        <StatCard
          icon={AlertTriangle}
          label="Warnings"
          value={health.warnings}
          tone="warning"
        />
        <StatCard icon={Info} label="Info" value={health.infos} tone="info" />
      </div>

      <Card className="p-0">
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto border-b border-border px-4 pt-4">
            <TabsList className="grid w-full min-w-[560px] max-w-3xl grid-cols-5">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="size-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="quality" className="gap-2">
                <ShieldCheck className="size-4" />
                Quality
                <CountBadge value={qualityCount(quality)} />
              </TabsTrigger>
              <TabsTrigger value="image-quality" className="gap-2">
                <Gauge className="size-4" />
                Image Quality
                <CountBadge value={imageQualityCount(imageQuality)} />
              </TabsTrigger>
              <TabsTrigger value="outliers" className="gap-2">
                <Activity className="size-4" />
                Outliers
                <CountBadge value={outlierCount(outliers)} />
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <Layers className="size-4" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 p-6">
            <AnalyticsTab analytics={analytics} />
          </TabsContent>

          <TabsContent value="quality" className="space-y-4 p-6">
            <QualityTab quality={quality} />
          </TabsContent>

          <TabsContent value="image-quality" className="space-y-4 p-6">
            <ImageQualityTab
              imageQuality={imageQuality}
              analyzed={report.imageQualityAnalyzed}
            />
          </TabsContent>

          <TabsContent value="outliers" className="space-y-4 p-6">
            <OutliersTab outliers={outliers} />
          </TabsContent>

          <TabsContent value="reports" className="p-6">
            <ReportsTab
              reports={reports}
              activeReportId={report.id}
              onSelect={onSelectReport}
              onDelete={onDeleteReport}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
