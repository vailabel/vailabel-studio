import { useCallback, useState } from "react"
import { studioCommands } from "@/shared/ipc/studio"
import {
  type ProjectConfig,
  mergeProjectConfig,
} from "@/shared/types/project-config"
import type { Project } from "@/shared/types/core"

interface UseProjectSettingsViewModelProps {
  project: Project | null
  /** Called after any successful save so the parent can reload project state. */
  onSaved: () => void
}

export function useProjectSettingsViewModel({
  project,
  onSaved,
}: UseProjectSettingsViewModelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const config = mergeProjectConfig(project?.config)

  const saveConfig = useCallback(
    async (next: ProjectConfig) => {
      if (!project) return
      setIsSaving(true)
      setSaveError(null)
      try {
        await studioCommands.projectsSave({ id: project.id, config: next })
        onSaved()
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsSaving(false)
      }
    },
    [project, onSaved]
  )

  const patchGeneral = useCallback(
    (patch: Partial<ProjectConfig["general"]>) =>
      saveConfig({ ...config, general: { ...config.general, ...patch } }),
    [config, saveConfig]
  )

  const patchExport = useCallback(
    (patch: Partial<ProjectConfig["export"]>) =>
      saveConfig({ ...config, export: { ...config.export, ...patch } }),
    [config, saveConfig]
  )

  const patchAi = useCallback(
    (patch: Partial<ProjectConfig["ai"]>) =>
      saveConfig({ ...config, ai: { ...config.ai, ...patch } }),
    [config, saveConfig]
  )

  const patchStorage = useCallback(
    (patch: Partial<ProjectConfig["storage"]>) =>
      saveConfig({ ...config, storage: { ...config.storage, ...patch } }),
    [config, saveConfig]
  )

  const deleteProject = useCallback(async () => {
    if (!project) return
    setIsDeleting(true)
    try {
      await studioCommands.projectsDelete(project.id)
    } finally {
      setIsDeleting(false)
    }
  }, [project])

  return {
    config,
    isSaving,
    isDeleting,
    saveError,
    patchGeneral,
    patchExport,
    patchAi,
    patchStorage,
    deleteProject,
  }
}
