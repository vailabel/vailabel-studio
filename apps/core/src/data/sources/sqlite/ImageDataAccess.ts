import { ImageData } from "../../../models/types"
import { IImageDataAccess } from "../../interface/IDataAccess"
import { DataAccess } from "./DataAccess"

export class ImageDataAccess
  extends DataAccess<ImageData>
  implements IImageDataAccess
{
  constructor() {
    super("images")
  }
  // You can add entity-specific methods here if needed
}
