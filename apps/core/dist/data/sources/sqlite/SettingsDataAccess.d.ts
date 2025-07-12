import { Settings } from "../../../models";
import { ISettingsDataAccess } from "../../contracts/IDataAccess";
import { SQLiteDataAccess } from "./SQLiteDataAccess";
export declare class SettingsDataAccess extends SQLiteDataAccess<Settings> implements ISettingsDataAccess {
    constructor();
    getByKey(key: string): Promise<Settings | null>;
    updateByKey(key: string, value: any): Promise<void>;
    deleteByKey(key: string): Promise<void>;
}
