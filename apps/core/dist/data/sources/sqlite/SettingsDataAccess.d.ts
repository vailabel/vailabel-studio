import { Settings } from "../../../models";
import { DataAccess } from "../../contracts/DataAccess";
import { ISettingsDataAccess } from "../../contracts/IDataAccess";
export declare class SettingsDataAccess extends DataAccess<Settings> implements ISettingsDataAccess {
    constructor();
    getByKey(key: string): Promise<Settings | null>;
    updateByKey(key: string, value: any): Promise<void>;
    deleteByKey(key: string): Promise<void>;
}
