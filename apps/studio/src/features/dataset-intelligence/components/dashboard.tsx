import { useEffect, useState } from "react"
import { Play, Sparkles } from "lucide-react"
import { services } from "@/shared/services"
import { useDatasetIntelligenceViewModel } from "@/features/dataset-intelligence/model/dataset-intelligence-viewmodel"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { AnalysisProgress } from "./analysis-progress"
import { AnalysisToolbar } from "./analysis-toolbar"
import { DatasetEmpty, DatasetLoading } from "./dataset-states"
import { PageHeading } from "./page-heading"
import { ReportView } from "./report-view"

/** Analysis dashboard for a single project. */
export function Dashboard({
  projectId,
  onChangeProject,
}: {
  projectId: string
  onChangeProject: () => void
}) {
  const vm = useDatasetIntelligenceViewModel(projectId)
  const [projectName, setProjectName] = useState("")
  const [includeImageQuality, setIncludeImageQuality] = useState(true)

  useEffect(() => {
    void services
      .getProjectService()
      .getById(projectId)
      .then((project) => setProjectName(project?.name ?? ""))
      .catch(() => setProjectName(""))
  }, [projectId])

  const runAnalysis = () => vm.runAnalysis({ includeImageQuality })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <PageHeading
          className="mb-6"
          subtitle={
            <Button
              variant="link"
              size="sm"
              onClick={onChangeProject}
              className="h-auto p-0 text-sm font-normal text-muted-foreground hover:text-foreground"
            >
              {projectName || "Project"} · change project
            </Button>
          }
          actions={
            <AnalysisToolbar
              includeImageQuality={includeImageQuality}
              onIncludeImageQualityChange={setIncludeImageQuality}
              isRunning={vm.isRunning}
              canExport={Boolean(vm.report)}
              onRun={runAnalysis}
              onExport={vm.exportReport}
            />
          }
        />

        {vm.isRunning && vm.job && (
          <div className="mb-6">
            <AnalysisProgress job={vm.job} />
          </div>
        )}

        {vm.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{vm.error}</AlertDescription>
          </Alert>
        )}

        {vm.isLoading ? (
          <DatasetLoading label="Loading analysis..." />
        ) : !vm.report ? (
          <DatasetEmpty
            icon={Sparkles}
            title="No analysis yet"
            description="Run an analysis to compute class balance, quality issues, image-quality metrics, and outliers for this dataset."
            action={
              <Button onClick={runAnalysis} disabled={vm.isRunning}>
                <Play />
                Run Analysis
              </Button>
            }
          />
        ) : (
          <ReportView
            report={vm.report}
            reports={vm.reports}
            onSelectReport={vm.selectReport}
            onDeleteReport={vm.deleteReport}
          />
        )}
      </div>
    </div>
  )
}
