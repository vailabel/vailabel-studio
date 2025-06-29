import { Project } from "@vailabel/core"
import { IProjectRepository } from "./IBaseRepository"
import { BaseRepository } from "./BaseRepository"

export class ProjectRepository
  extends BaseRepository<Project>
  implements IProjectRepository
{
  constructor() {
    super(Project)
  }
  // You can add entity-specific methods here if needed
}
