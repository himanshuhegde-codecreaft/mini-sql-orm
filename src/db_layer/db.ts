import mysql, { type ExecuteValues } from "mysql2/promise";

export class Database {
  private pool: mysql.Pool;
  static instance: Database;

  private constructor() {
    this.pool = mysql.createPool({
      host: "localhost",
      user: "myuser",
      database: "mydatabase",
      password: "mypassword",
      waitForConnections: true,
      connectionLimit: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  static async executeQuery(
    query: string,
    params: ExecuteValues[] = [],
  ): Promise<mysql.QueryResult> {
    const pool = Database.getInstance().pool;
    const [result] = await pool.execute(query, params);
    return result;
  }

  static async closePool(): Promise<void> {
    const pool = Database.getInstance().pool;
    await pool.end();
  }
}
