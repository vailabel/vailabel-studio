import { AIModel } from "@/shared/types/core"
import type { ModelImportPayload, ModelInstallPayload } from "@/shared/types/core"
import { studioCommands } from "@/shared/ipc/studio"
import type { GitHubRelease } from "@/shared/lib/github-releases"

export const aiModelsService = {
  list: () => studioCommands.aiModelsList(),
  listByProjectId: (projectId: string) =>
    studioCommands.aiModelsListByProject(projectId),
  create: (model: Partial<AIModel>) =>
    studioCommands.aiModelsSave(model),
  update: (modelId: string, updates: Partial<AIModel>) =>
    studioCommands.aiModelsSave({ id: modelId, ...updates }),
  delete: (modelId: string) => studioCommands.aiModelsDelete(modelId),
  setActive: (modelId: string) => studioCommands.aiModelsSetActive(modelId),
  importModel: (payload: ModelImportPayload) =>
    studioCommands.aiModelsImport(payload),
  installModel: (payload: ModelInstallPayload) =>
    studioCommands.aiModelsInstall(payload),
  listGitHubReleases: (owner: string, repo: string): Promise<GitHubRelease[]> =>
    studioCommands.aiModelsCatalogReleases({ owner, repo }),
}

