import { Label } from "../../../models"
import { DataAccess } from "../../contracts/DataAccess"
import { ILabelDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class LabelDataAccess
  extends SQLiteDataAccess<Label>
  implements ILabelDataAccess
{
  constructor() {
    super(Label)
  }

  async countByProjectId(projectId: string): Promise<number> {
    return (await window.ipc.invoke("sqlite:count", Label.name, {
      projectId,
    })) as Promise<number>
  }

  async getByProjectId(projectId: string): Promise<Label[]> {
    return (await window.ipc.invoke(
      "sqlite:getByProjectId",
      Label.name,
      projectId
    )) as Promise<Label[]>
  }
}
