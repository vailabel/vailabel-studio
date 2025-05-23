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
  // You can add entity-specific methods here if needed
}
