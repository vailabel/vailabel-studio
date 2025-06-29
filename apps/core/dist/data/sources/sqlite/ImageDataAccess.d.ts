import { ImageData } from "../../../models";
import { IImageDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class ImageDataAccess extends SQLiteDataAccess<ImageData> implements IImageDataAccess {
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
