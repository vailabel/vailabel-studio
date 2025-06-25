import { Project } from "@vailabel/core"
import { DataAccess } from "@vailabel/core/data"
import { IProjectDataAccess } from "@vailabel/core/data"

export class ProjectDataAccess
  extends DataAccess<Project>
  implements IProjectDataAccess
{
  constructor() {
    super(Project)
  }
  // You can add entity-specific methods here if needed
}
