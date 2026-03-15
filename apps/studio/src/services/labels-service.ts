import { Label } from "@/types/core"
import { studioCommands } from "@/ipc/studio"

export const labelsService = {
  getLabelsByProjectId: (projectId: string) =>
    studioCommands.labelsListByProject(projectId),
  createLabel: (label: Partial<Label>) => studioCommands.labelsSave(label),
  updateLabel: (labelId: string, updates: Partial<Label>) =>
    studioCommands.labelsSave({ id: labelId, ...updates }),
  deleteLabel: (labelId: string) => studioCommands.labelsDelete(labelId),
}

