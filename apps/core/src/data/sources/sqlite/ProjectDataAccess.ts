import { DataAccess, IProjectDataAccess } from "@vailabel/core/src/data"
import { Project } from "../../../models/types"

export class ProjectDataAccess
  extends DataAccess<Project>
  implements IProjectDataAccess
{
  constructor() {
    super("projects")
  }
  // You can add entity-specific methods here if needed
}
