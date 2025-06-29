import { Model, ModelCtor } from "sequelize-typescript";
import { IDataAccess } from "../../contracts/IDataAccess";
export declare class SQLiteDataAccess<T extends object = any> implements IDataAccess<T> {
    protected model: ModelCtor<Model<any, any>>;
    constructor(model: ModelCtor<Model<any, any>>);
    get(): Promise<T[]>;
    getById(id: string): Promise<T | null>;
    create(item: T): Promise<void>;
    update(id: string, updates: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
    paginate(offset: number, limit: number): Promise<T[]>;
}
