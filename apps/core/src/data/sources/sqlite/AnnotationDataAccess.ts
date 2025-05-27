import { Annotation } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { IAnnotationDataAccess } from "../../contracts/IDataAccess"

export class AnnotationDataAccess
  extends DataAccess<Annotation>
  implements IAnnotationDataAccess
{
  constructor() {
    super("annotations")
  }
  countByProjectId(projectId: string): Promise<number> {
    const result = window.ipc.invoke("sqlite:get", [
      `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ?`,
      [projectId],
    ])
    return result.then((data) => data.count)
  }
  getByProjectId(projectId: string): Promise<Annotation[]> {
    const result = window.ipc.invoke("sqlite:get", [
      `SELECT * FROM ${this.table} WHERE projectId = ?`,
      [projectId],
    ])
    return result.then((data) =>
      data.map((item: any) => ({ ...item, data: item.data }))
    )
  }
}
