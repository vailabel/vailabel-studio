import { Label } from "@vailabel/core"

export interface ILabelService {
  getLabelsByProjectId(projectId: string): Promise<Label[]>
  createLabel(label: Label): Promise<void>
  updateLabel(labelId: string, updates: Partial<Label>): Promise<void>
  deleteLabel(labelId: string): Promise<void>
}
