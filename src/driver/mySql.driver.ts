import type { ConnectionOptions } from "mysql2";
import type { IDatabaseDriver } from "../core/db.js";
import { createConnection, Connection } from "mysql2/promise";

export class MySqlDriver implements IDatabaseDriver {
  private connection: Connection | null = null;
  private connectionConfig: string | ConnectionOptions;

  constructor(connectionConfig: string | ConnectionOptions) {
    this.connectionConfig = connectionConfig;
  }

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }
    this.connection = await (typeof this.connectionConfig === "string"
      ? createConnection(this.connectionConfig)
      : createConnection(this.connectionConfig));
    await this.connection.query("SELECT 1");
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }
    await this.connection.end();
    this.connection = null;
  }

  async execute(query: string, params?: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error("Not connected to the database");
    }
    const [results] = await this.connection.execute(query, params);
    return results;
  }

  getPlaceholderPrefix(): string {
    return "?";
  }
  getInsertQuery(tableName: string, columns: string[]): string {
    const placeholders = columns
      .map(() => this.getPlaceholderPrefix())
      .join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  }

  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: Record<string, unknown>,
  ): string {
    const columnPlaceholders = columns
      .map((column) => `${column} = ${this.getPlaceholderPrefix()}`)
      .join(", ");
    const conditionPlaceHolders = Object.keys(conditions)
      .map((condition) => {
        return `${condition} = ${this.getPlaceholderPrefix()}`;
      })
      .join(" AND ");

    const whereStatement = ` WHERE ${conditionPlaceHolders}`;

    return `UPDATE ${tableName} SET ${columnPlaceholders}${whereStatement}`;
  }
  getDeleteQuery(
    tableName: string,
    conditions: Record<string, unknown>,
    limit?: number,
  ): string {
    const conditionPlaceHolders = Object.keys(conditions)
      .map((condition) => `${condition} = ${this.getPlaceholderPrefix()}`)
      .join(" AND ");
    const whereStatement = ` WHERE ${conditionPlaceHolders}`;
    const limitStatement = limit === undefined ? ` LIMIT ${limit}` : "";
    return `DELETE FROM ${tableName}${whereStatement}${limitStatement}`;
  }
  getSelectQuery(
    tableName: string,
    columns: string[],
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    const columnString = columns.join(", ");
    const conditionPlaceHolders = conditions
      ? Object.keys(conditions)
          .map((condition) => `${condition} = ${this.getPlaceholderPrefix()}`)
          .join(" AND ")
      : "";
    const whereStatement = conditionPlaceHolders
      ? ` WHERE ${conditionPlaceHolders}`
      : "";
    const limitStatement = limit === undefined ? ` LIMIT ${limit}` : "";
    const offsetStatement = offset === undefined ? ` OFFSET ${offset}` : "";
    return `SELECT ${columnString} FROM ${tableName}${whereStatement}${limitStatement} ${offsetStatement}`;
  }
  getCountQuery(
    tableName: string,
    conditions?: Record<string, unknown>,
  ): string {
    const conditionPlaceHolders = conditions
      ? Object.keys(conditions)
          .map((key) => `${key} = ${this.getPlaceholderPrefix()}`)
          .join(" AND ")
      : "";
    const whereStatement = conditionPlaceHolders
      ? ` WHERE ${conditionPlaceHolders}`
      : "";

    return `SELECT COUNT(*) FROM ${tableName}${whereStatement}`;
  }
}
