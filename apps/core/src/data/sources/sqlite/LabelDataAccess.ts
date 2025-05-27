import { Label } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { ILabelDataAccess } from "../../contracts/IDataAccess"

export class LabelDataAccess
  extends DataAccess<Label>
  implements ILabelDataAccess
{
  constructor() {
    super("labels")
  }
  countByProjectId(projectId: string): Promise<number> {
    const result = window.ipc.invoke("sqlite:get", [
      `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ?`,
      [projectId],
    ])
    return result.then((data) => data.count)
  }
  getByProjectId(projectId: string): Promise<Label[]> {
    const result = window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE projectId = ?`,
      [projectId],
    ])
    return result.then((data) =>
      data.map((item: any) => ({ ...item, data: item.data }))
    )
  }
}
