import type { QueryResult } from "mysql2";
import { Database } from "../db_layer/db.js";
import { TABLE_METADATA_KEY } from "./table.decorator.js";

export interface IBaseEntity {
  id: number;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

export abstract class BaseEntity implements IBaseEntity {
  id: number;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;

  constructor(entity: IBaseEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.createdBy = entity.createdBy;
    this.updatedAt = entity.updatedAt;
    this.updatedBy = entity.updatedBy;
  }

  static getTableName(): string {
    return Reflect.getMetadata(TABLE_METADATA_KEY, this);
  }

  // TASK: update this to insert / update
  async save<T extends this>(update?: {
    where: Partial<Omit<T, "save">>;
    data: Partial<Omit<T, "save" | "id">>;
  }): Promise<QueryResult> {
    if (update) {
      const valuePlaceholders = Object.keys(update.data)
        .map((key) => `${key} = ?`)
        .join(", ");

      const wherePlaceholders = Object.keys(update.where)
        .map((key) => `${key} = ?`)
        .join(" AND ");

      const query = `UPDATE ${(
        this.constructor as typeof BaseEntity
      ).getTableName()} SET ${valuePlaceholders} WHERE ${wherePlaceholders}`;

      return await Database.executeQuery(query, [
        ...Object.values(update.data),
        ...Object.values(update.where),
      ]);
    } else {
      const keys = Object.keys(this);
      const columns = keys.join(", ");
      const values_placeholder = "?, ".repeat(keys.length).slice(0, -2);

      const query = `INSERT INTO ${(
        this.constructor as typeof BaseEntity
      ).getTableName()} (${columns}) VALUES (${values_placeholder})`;

      return await Database.executeQuery(query, Object.values(this));
    }
  }

  static async findById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T | null> {
    const query = `SELECT * FROM ${Reflect.getMetadata(
      TABLE_METADATA_KEY,
      this,
    )} WHERE id = ?`;

    const result = (await Database.executeQuery(query, [id])) as I[];

    if (result.length === 0 || result[0] === undefined) return null;

    return new this(result[0]);
  }

  // TASKS:
  static async findAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
  ): Promise<T[]> {
    const query = `SELECT * FROM ${Reflect.getMetadata(
      TABLE_METADATA_KEY,
      this,
    )}`;

    const results = (await Database.executeQuery(query)) as I[];

    return results.map((result) => new this(result));
  }

  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Partial<I>,
  ): Promise<T | null> {
    const valuePlaceholders = Object.keys(conditions)
      .map((key) => `${key} = ?`)
      .join(" AND ");

    const query = `SELECT * FROM ${Reflect.getMetadata(
      TABLE_METADATA_KEY,
      this,
    )} WHERE ${valuePlaceholders}`;

    const results = (await Database.executeQuery(
      query,
      Object.values(conditions),
    )) as I[];

    if (results.length === 0 || results[0] === undefined) return null;

    return new this(results[0]);
  }

  static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<QueryResult> {
    const query = `DELETE FROM ${Reflect.getMetadata(
      TABLE_METADATA_KEY,
      this,
    )} WHERE id = ?`;

    return await Database.executeQuery(query, [id]);
  }

  static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
  ): Promise<QueryResult> {
    const query = `DELETE FROM ${Reflect.getMetadata(
      TABLE_METADATA_KEY,
      this,
    )}`;

    return await Database.executeQuery(query);
  }

  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Partial<I>,
  ): Promise<QueryResult> {
    const valuePlaceholders = Object.keys(conditions)
      .map((key) => `${key} = ?`)
      .join(" AND ");

    const query = `DELETE FROM ${Reflect.getMetadata(
      TABLE_METADATA_KEY,
      this,
    )} WHERE ${valuePlaceholders}`;

    return await Database.executeQuery(query, Object.values(conditions));
  }

  static async closeConnection(): Promise<void> {
    await Database.closePool();
  }
}
