import { ImageData } from "../../../models/types";
import { DataAccess } from "../../contracts/DataAccess";
import { IImageDataAccess } from "../../contracts/IDataAccess";
export declare class ImageDataAccess extends DataAccess<ImageData> implements IImageDataAccess {
    constructor();
    getImageWithAnnotations(imageId: string): Promise<ImageData | null>;
    getNext(projectId: string, currentImageId: string): Promise<{
        id: string | undefined;
        hasNext: boolean;
    }>;
    getPrevious(projectId: string, currentImageId: string): Promise<{
        id: string | undefined;
        hasPrevious: boolean;
    }>;
    getByProjectId(projectId: string): Promise<ImageData[]>;
    countByProjectId(projectId: string): Promise<number>;
}
