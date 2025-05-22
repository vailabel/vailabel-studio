import { Settings } from "../../../models/types";
import { DataAccess } from "../../contracts/DataAccess";
import { ISettingsDataAccess } from "../../contracts/IDataAccess";
export declare class SettingsDataAccess extends DataAccess<Settings> implements ISettingsDataAccess {
    constructor();
}
