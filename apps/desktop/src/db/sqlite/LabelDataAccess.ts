import { Label } from "@vailabel/core"
import { DataAccess } from "@vailabel/core/data"
import { ILabelDataAccess } from "@vailabel/core/data"

export class LabelDataAccess
  extends DataAccess<Label>
  implements ILabelDataAccess
{
  constructor() {
    super(Label)
  }

  async countByProjectId(projectId: string): Promise<number> {
    return Label.count({ where: { projectId } })
  }

  async getByProjectId(projectId: string): Promise<Label[]> {
    return Label.findAll({ where: { projectId } })
  }
}
