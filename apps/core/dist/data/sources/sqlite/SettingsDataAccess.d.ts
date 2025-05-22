import { Settings } from "../../../models/types";
import { ISettingsDataAccess } from "../../interface/IDataAccess";
import { DataAccess } from "./DataAccess";
export declare class SettingsDataAccess extends DataAccess<Settings> implements ISettingsDataAccess {
    constructor();
}
