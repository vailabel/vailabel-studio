import { IDataAdapter } from "@/adapters/data/IDataAdapter"
import { ILabelService } from "../contracts/ILabelService"
import { Label } from "@vailabel/core"

export class LabelService implements ILabelService {
  private dataAdapter: IDataAdapter

  constructor(dataAdapter: IDataAdapter) {
    this.dataAdapter = dataAdapter
  }

  async getLabelsByProjectId(projectId: string): Promise<Label[]> {
    return await this.dataAdapter.fetchLabels(projectId)
  }

  async createLabel(label: Label): Promise<void> {
    await this.dataAdapter.saveLabel(label)
  }

  async updateLabel(labelId: string, updates: Partial<Label>): Promise<void> {
    await this.dataAdapter.updateLabel(labelId, updates)
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.dataAdapter.deleteLabel(labelId)
  }
}
