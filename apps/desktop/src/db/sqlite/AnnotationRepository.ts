import { Annotation } from "@vailabel/core"
import { IAnnotationRepository } from "./IBaseRepository"
import { BaseRepository } from "./BaseRepository"

export class AnnotationRepository
  extends BaseRepository<Annotation>
  implements IAnnotationRepository
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
