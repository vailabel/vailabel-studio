import { ImageData } from "../../../models/types";
import { DataAccess } from "../../contracts/DataAccess";
import { IImageDataAccess } from "../../contracts/IDataAccess";
export declare class ImageDataAccess extends DataAccess<ImageData> implements IImageDataAccess {
    constructor();
}
