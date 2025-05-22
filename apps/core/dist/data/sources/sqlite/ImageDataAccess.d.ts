import { ImageData } from "../../../models/types";
import { IImageDataAccess } from "../../interface/IDataAccess";
import { DataAccess } from "./DataAccess";
export declare class ImageDataAccess extends DataAccess<ImageData> implements IImageDataAccess {
    constructor();
}
