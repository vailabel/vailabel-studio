import { Annotation } from "../../../models"
import { DataAccess } from "../../contracts/DataAccess"
import { IAnnotationDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class AnnotationDataAccess
  extends SQLiteDataAccess<Annotation>
  implements IAnnotationDataAccess
{
  constructor() {
    super(Annotation)
  }

  async countByProjectId(projectId: string): Promise<number> {
    // Count annotations by projectId using Sequelize
    return (await window.ipc.invoke("sqlite:count", Annotation.name, {
      projectId,
    })) as Promise<number>
  }

  async getByProjectId(projectId: string): Promise<Annotation[]> {
    // Find all annotations by projectId using Sequelize
    return (await window.ipc.invoke(
      "sqlite:getByProjectId",
      Annotation.name,
      projectId
    )) as Promise<Annotation[]>
  }
}
