// Port of uhabits-core/.../database/{Database,Cursor}.kt over @sqlite.org/sqlite-wasm.
import type { Database as Sqlite3DB, PreparedStatement } from "@sqlite.org/sqlite-wasm";

// Values that can be bound to SQL parameters or returned from columns.
export type DbValue = string | number | null;

export class WebCursor {
  private stmt: PreparedStatement;

  constructor(stmt: PreparedStatement) {
    this.stmt = stmt;
  }

  moveToNext(): boolean {
    return this.stmt.step();
  }

  getInt(index: number): number | null {
    const v = this.stmt.get(index);
    return v == null ? null : Number(v);
  }

  getLong(index: number): number | null {
    const v = this.stmt.get(index);
    return v == null ? null : Number(v);
  }

  getDouble(index: number): number | null {
    const v = this.stmt.get(index);
    return v == null ? null : Number(v);
  }

  getString(index: number): string | null {
    return this.stmt.getString(index);
  }

  close(): void {
    this.stmt.finalize();
  }

  [Symbol.dispose](): void {
    this.close();
  }
}

export class WebDatabase {
  private txSuccessful = false;

  constructor(private readonly db: Sqlite3DB) {}

  query(q: string, ...params: string[]): WebCursor {
    const stmt = this.db.prepare(q);
    params.forEach((p, i) => stmt.bind(i + 1, p));
    return new WebCursor(stmt);
  }

  update(
    table: string,
    values: Record<string, DbValue>,
    where: string,
    ...params: string[]
  ): number {
    const entries = Object.entries(values);
    const setClauses = entries.map(([k]) => `${k}=?`).join(", ");
    const allParams: DbValue[] = [...entries.map(([, v]) => v), ...params];
    const stmt = this.db.prepare(`update ${table} set ${setClauses} where ${where}`);
    allParams.forEach((p, i) => stmt.bind(i + 1, p));
    stmt.stepFinalize();
    return this.db.changes() as number;
  }

  insert(table: string, values: Record<string, DbValue>): number | null {
    const keys = Object.keys(values);
    const vals = Object.values(values);
    const placeholders = keys.map(() => "?").join(", ");
    const stmt = this.db.prepare(
      `insert into ${table}(${keys.join(", ")}) values(${placeholders})`,
    );
    vals.forEach((v, i) => stmt.bind(i + 1, v));
    stmt.stepFinalize();
    const rowId = this.db.selectValue("select last_insert_rowid()");
    return rowId != null ? Number(rowId) : null;
  }

  delete(table: string, where: string, ...params: string[]): void {
    this.execute(`delete from ${table} where ${where}`, ...params);
  }

  execute(query: string, ...params: DbValue[]): void {
    if (params.length === 0) {
      this.db.exec(query);
      return;
    }
    const stmt = this.db.prepare(query);
    params.forEach((p, i) => stmt.bind(i + 1, p));
    stmt.stepFinalize();
  }

  beginTransaction(): void {
    this.txSuccessful = false;
    this.db.exec("BEGIN");
  }

  setTransactionSuccessful(): void {
    this.txSuccessful = true;
  }

  endTransaction(): void {
    this.db.exec(this.txSuccessful ? "COMMIT" : "ROLLBACK");
  }

  get version(): number {
    const cursor = this.query("PRAGMA user_version");
    try {
      cursor.moveToNext();
      return cursor.getInt(0) ?? 0;
    } finally {
      cursor.close();
    }
  }

  close(): void {
    this.db.close();
  }
}
