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

type ExcludedProps = "updatedAt" | "createdAt" | "save" | "id";

export abstract class BaseEntity implements IBaseEntity {
  @Column()
  id?: number | undefined;

  @Column("created_at")
  createdAt: Date;
  @Column("created_by")
  createdBy: number;
  @Column("updated_at")
  updatedAt: Date;
  @Column("updated_by")
  updatedBy: number;

  constructor(entity: IBaseEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.createdBy = entity.createdBy;
    this.updatedAt = entity.updatedAt;
    this.updatedBy = entity.updatedBy;
  }

  async save(): Promise<void> {
    try {
      const ctor = this.constructor;
      const proto = Object.getPrototypeOf(this) as object;
      const keys = Object.keys(this);
      const columnsMetadata = keys
        .map((k) => getColumnSqlName(proto, k))
        .filter((metadata) => {
          return !(metadata.propertyName === "id") && metadata.dbColumnName;
        });
      const values = columnsMetadata.map(
        (col) => (this as any)[col.propertyName],
      );
      const columns = columnsMetadata.map((col) => col.dbColumnName);
      const query = DB.driver.getInsertQuery(
        Reflect.getMetadata(TABLE_METADATA_KEY, ctor),
        columns,
      );
      await DB.driver.execute(query, values);
    } catch (err) {
      console.error("Error saving entity:", err);
      throw err;
    }
  }
  private reverseKeyMapp<T extends BaseEntity>(
    this: T,
  ): Record<string, string> {
    try {
      const keys = Object.keys(this);
      const reverseKeyMapp: Record<string, string> = {};
      for (const key of keys) {
        const { dbColumnName } = getColumnSqlName(
          Object.getPrototypeOf(this),
          key,
        );
        if (dbColumnName) {
          reverseKeyMapp[dbColumnName] = key;
        }
      }
      return reverseKeyMapp;
    } catch (err) {
      console.error("Error creating reverse key mapping:", err);
      throw err;
    }
  }
  static async findAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Partial<I>,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    try {
      let newConditions: Record<string, unknown> = {};
      if (conditions !== undefined) {
        for (const key of Object.keys(conditions)) {
          const { dbColumnName } = getColumnSqlName(this.prototype, key);
          if (dbColumnName === undefined) {
            continue;
          }
          newConditions[dbColumnName] = conditions[key as keyof typeof conditions];
        }
      }
      const reverseKeyMapp = new this({} as I).reverseKeyMapp();

      const query = DB.driver.getSelectQuery(
        Reflect.getMetadata(TABLE_METADATA_KEY, this),
        ["*"],
        newConditions,
        limit,
        offset,
      );
      const result = await DB.driver.execute(query, Object.values(newConditions));
      return result.rows.map((row: any) => {
        const entityObj: Record<string, unknown> = {};
        for (const key of Object.keys(row)) {
          const propertyName = reverseKeyMapp[key] ?? key;
          entityObj[propertyName] = row[key];
        }
        return new this(entityObj as I);
      });
    } catch (err) {
      console.error("Error finding entities:", err);
      throw err;
    }
  }
  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Partial<I>,
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
    conditions: Partial<I>,
  ): Promise<number> {
    try {
      let newCondition: Record<string, unknown> | undefined = {};
      if (conditions !== undefined) {
        for (const key of Object.keys(conditions)) {
          const { dbColumnName } = getColumnSqlName(this.prototype, key);
          if (dbColumnName === undefined) {
            newCondition[key] = conditions[key as keyof typeof conditions];
            continue;
          }
          newCondition[dbColumnName] = conditions[key as keyof typeof conditions];
        }
      }
      const query = DB.driver.getDeleteQuery(
        Reflect.getMetadata(TABLE_METADATA_KEY, this),
        newCondition,
      );
      const result = await DB.driver.execute(query, Object.values(newCondition));
      return result.rowCount;
    } catch (err) {
      console.error("Error deleting entities:", err);
      throw err;
    }
  }
  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Partial<I>,
  ): Promise<boolean> {
    const selectQuery = DB.driver.getSelectQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      ["id"],
      conditions,
      1,
    );
    const result = await DB.driver.execute(
      selectQuery,
      Object.values(conditions),
    );
    if (result.rows.length === 0) {
      return false;
    }
    const affectedRows = await (this as any).deleteAll(result.rows[0]);
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
    conditions?: Partial<I>,
  ): Promise<number> {
    try {
      const query = DB.driver.getCountQuery(
        Reflect.getMetadata(TABLE_METADATA_KEY, this),
        conditions,
      );
      
      const result = await DB.driver.execute(
        query,
        Object.values(conditions ?? {}),
      );
      return result.rows[0].count;
    } catch (err) {
      console.error("Error counting entities:", err);
      throw err;
    }
  }
  static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    updates: Omit<Partial<I>, ExcludedProps>,
    conditions: Partial<I>,
  ): Promise<number> {
    try {
      const newUpdates: Record<string, any> = {
        updated_at: new Date(),
      };
      for (const key of Object.keys(updates)) {
        const { dbColumnName } = getColumnSqlName(this.prototype, key);

        if (dbColumnName !== undefined) {
          newUpdates[dbColumnName] = updates[key as keyof typeof updates];
          continue;
        }
        newUpdates[key] = updates[key as keyof typeof updates];
      }

      const newConditions: Record<string, unknown> = {};
      for (const key of Object.keys(conditions)) {
        const { dbColumnName } = getColumnSqlName(this.prototype, key);
        if (dbColumnName !== undefined) {
          newConditions[dbColumnName] = conditions[key as keyof typeof conditions];
          continue;
        }
        newConditions[key] = conditions[key as keyof typeof conditions];
      }
      const query = DB.driver.getUpdateQuery(
        Reflect.getMetadata(TABLE_METADATA_KEY, this),
        Object.keys(newUpdates),
        newConditions,
      );
      const params = [
        ...Object.values(newUpdates),
        ...Object.values(newConditions),
      ];

      const result = await DB.driver.execute(query, params);

      return result.rowCount;
    } catch (err) {
      console.error("Error updating entities:", err);
      throw err;
    }
  }

  static async updateById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
    updates: Omit<Partial<I>, ExcludedProps>,
  ): Promise<boolean> {
    const affectedRows = await (this as any).updateAll(updates, { id });
    return affectedRows > 0;
  }
}
