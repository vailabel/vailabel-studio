import { Annotation } from "@vailabel/core"
import { DataAccess, IAnnotationDataAccess } from "@vailabel/core/data"

export class AnnotationDataAccess
  extends DataAccess<Annotation>
  implements IAnnotationDataAccess
{
  constructor() {
    super(Annotation)
  }

  async countByProjectId(projectId: string): Promise<number> {
    // Count annotations by projectId using Sequelize
    return Annotation.count({ where: { projectId } })
  }

  async getByProjectId(projectId: string): Promise<Annotation[]> {
    // Find all annotations by projectId using Sequelize
    return Annotation.findAll({ where: { projectId } })
  }
}
