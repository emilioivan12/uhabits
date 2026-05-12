// @vitest-environment node
// Uses the Node.js variant of sqlite-wasm so these tests run without a browser.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import sqlite3Init, { type Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { WebDatabase } from "./sqlite";

let sqlite3: Sqlite3Static;

beforeAll(async () => {
  sqlite3 = await sqlite3Init();
});

function makeDb(): WebDatabase {
  return new WebDatabase(new sqlite3.oo1.DB(":memory:"));
}

describe("WebDatabase", () => {
  let db: WebDatabase;

  afterEach(() => {
    db.close();
  });

  it("version is 0 on a fresh in-memory database", () => {
    db = makeDb();
    expect(db.version).toBe(0);
  });

  it("PRAGMA user_version round-trips via execute + version getter", () => {
    db = makeDb();
    db.execute("PRAGMA user_version = 9");
    expect(db.version).toBe(9);
  });

  it("execute + query round-trips a CREATE / INSERT / SELECT", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text, score real)");
    db.execute("insert into t(name, score) values(?, ?)", "Alice", 3.14);

    const cursor = db.query("select name, score from t where id = 1");
    expect(cursor.moveToNext()).toBe(true);
    expect(cursor.getString(0)).toBe("Alice");
    expect(cursor.getDouble(1)).toBeCloseTo(3.14);
    expect(cursor.moveToNext()).toBe(false);
    cursor.close();
  });

  it("insert returns the auto-generated row id", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text)");
    const id1 = db.insert("t", { name: "Alice" });
    const id2 = db.insert("t", { name: "Bob" });
    expect(id1).toBe(1);
    expect(id2).toBe(2);
  });

  it("update modifies matching rows and returns the affected row count", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text, val integer)");
    db.insert("t", { name: "Alice", val: 1 });
    db.insert("t", { name: "Alice", val: 2 });
    db.insert("t", { name: "Bob", val: 3 });

    const affected = db.update("t", { val: 99 }, "name = ?", "Alice");
    expect(affected).toBe(2);

    const cursor = db.query("select val from t where name = ? order by id", "Alice");
    cursor.moveToNext();
    expect(cursor.getInt(0)).toBe(99);
    cursor.moveToNext();
    expect(cursor.getInt(0)).toBe(99);
    cursor.close();
  });

  it("delete removes matching rows", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text)");
    db.insert("t", { name: "Alice" });
    db.insert("t", { name: "Bob" });

    db.delete("t", "name = ?", "Alice");

    const cursor = db.query("select count(*) from t");
    cursor.moveToNext();
    expect(cursor.getInt(0)).toBe(1);
    cursor.close();
  });

  it("transaction commit persists inserts", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text)");

    db.beginTransaction();
    db.insert("t", { name: "Alice" });
    db.setTransactionSuccessful();
    db.endTransaction();

    const cursor = db.query("select count(*) from t");
    cursor.moveToNext();
    expect(cursor.getInt(0)).toBe(1);
    cursor.close();
  });

  it("transaction rollback discards inserts when setTransactionSuccessful is not called", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text)");

    db.beginTransaction();
    db.insert("t", { name: "Alice" });
    // intentionally omit setTransactionSuccessful
    db.endTransaction();

    const cursor = db.query("select count(*) from t");
    cursor.moveToNext();
    expect(cursor.getInt(0)).toBe(0);
    cursor.close();
  });

  it("null values round-trip correctly", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, name text, val integer)");
    db.insert("t", { name: null, val: null });

    const cursor = db.query("select name, val from t where id = 1");
    cursor.moveToNext();
    expect(cursor.getString(0)).toBeNull();
    expect(cursor.getInt(1)).toBeNull();
    cursor.close();
  });

  it("getLong returns integer values as numbers", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key, ts integer)");
    const ts = 1_700_000_000_000;
    db.insert("t", { ts });

    const cursor = db.query("select ts from t where id = 1");
    cursor.moveToNext();
    expect(cursor.getLong(0)).toBe(ts);
    cursor.close();
  });

  it("WebCursor Symbol.dispose finalises the prepared statement", () => {
    db = makeDb();
    db.execute("create table t(id integer primary key)");
    {
      using cursor = db.query("select * from t");
      expect(cursor.moveToNext()).toBe(false);
    }
    // If the statement were not finalised, db.close() below would throw
    // "unable to close due to unfinalized statement".
  });
});
