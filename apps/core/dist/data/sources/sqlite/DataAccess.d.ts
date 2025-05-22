import { IDataAccess } from "../../interface/IDataAccess";
export declare class DataAccess<T extends object = any> implements IDataAccess<T> {
    protected table: string;
    constructor(table: string);
    get<T>(): Promise<T[]>;
    getById<T>(id: string): Promise<T | null>;
    create(item: T): Promise<void>;
    update(id: string, updates: Partial<T>): Promise<void>;
    delete(id: string): Promise<void>;
    paginate<T>(offset: number, limit: number): Promise<T[]>;
}
