import { DB } from "./db.js";
import { Column, getColumnSqlName } from "./column.decorator.js";
import { TABLE_METADATA_KEY } from "./table.decorator.js";

export interface IBaseEntity {
  id?: number | undefined;

  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

export abstract class BaseEntity implements IBaseEntity {
  @Column()
  id?: number | undefined;

  @Column('created_at')
  createdAt: Date;
  @Column('created_by')
  createdBy: number;
  @Column('updated_at')
  updatedAt: Date;
  @Column('updated_by')
  updatedBy: number;

  constructor(entity: IBaseEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.createdBy = entity.createdBy;
    this.updatedAt = entity.updatedAt;
    this.updatedBy = entity.updatedBy;
  }

  async save(): Promise<void> {
    const ctor = this.constructor;
    const proto = Object.getPrototypeOf(this) as object;
    const keys = Object.keys(this);

    const columnsMetadata = keys
      .map((k) => getColumnSqlName(proto, k))
      .filter((metadata) =>{
        return !(metadata.propertyName ==='id') && metadata.dbColumnName});
    const values = columnsMetadata.map(
      (col) => (this as any)[col.propertyName],
    )
    const columns = columnsMetadata.map((col) => col.dbColumnName);
    const query = DB.driver.getInsertQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, ctor),
      columns,
    );
    await DB.driver.execute(query, values);
  }
    reverseKeyMapp<T extends BaseEntity,>(this: T,): Record<string, string> {
    const keys = Object.keys(this);
    const reverseKeyMapp: Record<string, string> = {};
    for (const key of keys) {
      const { dbColumnName } = getColumnSqlName(Object.getPrototypeOf(this), key);
      if (dbColumnName) {
        reverseKeyMapp[dbColumnName] = key;
      }
    }
    return reverseKeyMapp;
  }
  static async findAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    let condition: Record<string, unknown> | undefined = {};
    if (conditions !== undefined) {
      for (const key of Object.keys(conditions)) {
        const { dbColumnName } = getColumnSqlName(this.prototype, key);
        if (dbColumnName === undefined) {
          continue;
        }
        condition[dbColumnName] = conditions[key];
    }
    }
    const reverseKeyMapp = new this({} as I).reverseKeyMapp();
   

    const query = DB.driver.getSelectQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      ["*"],
      condition,
      limit,
      offset,
    );
    const result = (await DB.driver.execute(query,Object.values(condition)));
    return result.rows.map((row: any) => {
        const entityObj: Record<string, unknown> = {};
        for (const key of Object.keys(row)) {
            const propertyName = reverseKeyMapp[key] ?? key;
            entityObj[propertyName] = row[key];
        }
        return new this(entityObj as I);
    });
  }
  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<T | null> {
    const results = await (this as any).findAll(conditions);
    return results.length > 0 ? results[0] : null;
  }
  static async findById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T | null> {
    return await (this as any).findOne({ id });
  }
  static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<number> {
    let condition: Record<string, unknown> | undefined = {};
    if (conditions !== undefined) {
      for (const key of Object.keys(conditions)) {
        const { dbColumnName } = getColumnSqlName(this.prototype, key);
        if (dbColumnName === undefined) {
          continue;
        }
        condition[dbColumnName] = conditions[key];
      }
    }
    const query = DB.driver.getDeleteQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      condition
    );
    const result = await DB.driver.execute(query,Object.values(conditions));
    return result.rowCount ;
  }
  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<boolean> {
    const condition = await (this as any).findOne(conditions);
    const affectedRows = await (this as any).deleteAll(condition);
    return affectedRows > 0;
  }
  static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<boolean> {
    return await (this as any).deleteOne({ id });
  }
  static async count<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Record<string, unknown>,
  ): Promise<number> {
    const query = DB.driver.getCountQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      conditions,
    );
    const result = await DB.driver.execute(query);
    return result[0].count;
  }
  static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    updates: Record<string, unknown>,
    conditions: Record<string, unknown>,
  ): Promise<number> {
    const query = DB.driver.getUpdateQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      Object.keys(updates),
      conditions,
    );
    console.log("Update Query:", query);
    const params = [...Object.values(updates), ...Object.values(conditions)];
    console.log(params)

    const result = await DB.driver.execute(query, params);
    console.log(result)
    
    return result.rowCount;
  }
  static async updateById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
    updates: Record<string, unknown>,
  ): Promise<boolean> {
    const affectedRows = await (this as any).updateAll(updates, { id });
    return affectedRows > 0;
  }
}
