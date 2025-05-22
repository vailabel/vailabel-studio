import { Annotation } from "../../../models/types"
import { IAnnotationDataAccess } from "../../interface/IDataAccess"
import { DataAccess } from "./DataAccess"
import { SQLiteDataAccess } from "./SQLiteDataAccess"

export class AnnotationDataAccess
  extends DataAccess<Annotation>
  implements IAnnotationDataAccess
{
  constructor() {
    super("annotations")
  }
  // You can add entity-specific methods here if needed
}
