import { ImageData } from "../../../models/types"
import { DataAccess } from "../../contracts/DataAccess"
import { IImageDataAccess } from "../../contracts/IDataAccess"

export class ImageDataAccess
  extends DataAccess<ImageData>
  implements IImageDataAccess
{
  constructor() {
    super("images")
  }
  // You can add entity-specific methods here if needed
}
