import { IDataAccess } from "@vailabel/core/src/data"
import { Project } from "../../../models/types"
import { IProjectDataAccess } from "../../interface/IDataAccess"
import { DataAccess } from "./DataAccess"

export class ProjectDataAccess
  extends DataAccess<Project>
  implements IProjectDataAccess
{
  constructor() {
    super("projects")
  }
  // You can add entity-specific methods here if needed
}
