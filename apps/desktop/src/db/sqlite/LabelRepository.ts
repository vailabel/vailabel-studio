import { Label } from "@vailabel/core"
import { BaseRepository } from "./BaseRepository"
import { ILabelRepository } from "./IBaseRepository"

export class LabelRepository
  extends BaseRepository<Label>
  implements ILabelRepository
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
