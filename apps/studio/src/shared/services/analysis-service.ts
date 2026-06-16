import { studioCommands } from "@/shared/ipc/studio"
import type { AnalysisConfig } from "@/shared/types/dataset-intelligence"

export const analysisService = {
  run: (projectId: string, config?: AnalysisConfig) =>
    studioCommands.analysisRun({ projectId, config }),
  jobStatus: (jobId: string) => studioCommands.analysisJobStatus(jobId),
  listReports: (projectId: string) =>
    studioCommands.analysisReportsList(projectId),
  getReport: (id: string) => studioCommands.analysisReportGet(id),
  latestReport: (projectId: string) =>
    studioCommands.analysisReportLatest(projectId),
  deleteReport: (id: string) => studioCommands.analysisReportDelete(id),
}
