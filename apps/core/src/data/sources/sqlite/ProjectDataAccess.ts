import { Project } from "../../../models"
import { IProjectDataAccess } from "../../contracts/IDataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class ProjectDataAccess
  extends SQLiteDataAccess<Project>
  implements IProjectDataAccess
{
  constructor() {
    super(Project)
  }
  // You can add entity-specific methods here if needed
}
