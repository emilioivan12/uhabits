// Ported from SQLParser.kt behaviour; pathological cases per stage-2-persistence.md §Step 2.
import { describe, expect, it } from "vitest";
import { parse } from "./sqlParser";

// Migration strings are imported as raw text to verify the parser handles all 17 files.
import m09 from "./migrations/09.sql?raw";
import m10 from "./migrations/10.sql?raw";
import m11 from "./migrations/11.sql?raw";
import m12 from "./migrations/12.sql?raw";
import m13 from "./migrations/13.sql?raw";
import m14 from "./migrations/14.sql?raw";
import m15 from "./migrations/15.sql?raw";
import m16 from "./migrations/16.sql?raw";
import m17 from "./migrations/17.sql?raw";
import m18 from "./migrations/18.sql?raw";
import m19 from "./migrations/19.sql?raw";
import m20 from "./migrations/20.sql?raw";
import m21 from "./migrations/21.sql?raw";
import m22 from "./migrations/22.sql?raw";
import m23 from "./migrations/23.sql?raw";
import m24 from "./migrations/24.sql?raw";
import m25 from "./migrations/25.sql?raw";

describe("parse — pathological inputs", () => {
  it("single statement no semicolon", () => {
    expect(parse("select 1")).toEqual(["select 1"]);
  });

  it("single statement with semicolon", () => {
    expect(parse("select 1;")).toEqual(["select 1"]);
  });

  it("multiple statements", () => {
    expect(parse("select 1; select 2;")).toEqual(["select 1", "select 2"]);
  });

  it("string containing semicolon is one statement, not two", () => {
    expect(parse("select ';' as s;")).toEqual(["select ';' as s"]);
  });

  it("line comment strips comment and leaves statement", () => {
    expect(parse("-- a;\nselect 1;")).toEqual(["select 1"]);
  });

  it("block comment containing semicolons is one statement", () => {
    expect(parse("/* x; y */ select 1;")).toEqual(["select 1"]);
  });

  it("block comment inline — no space injected on exit (matches Kotlin behaviour)", () => {
    const stmts = parse("select/* comment */1;");
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toBe("select1");
  });

  it("empty input returns empty array", () => {
    expect(parse("")).toEqual([]);
  });

  it("only whitespace returns empty array", () => {
    expect(parse("   \n\t  ")).toEqual([]);
  });

  it("whitespace is collapsed to single space", () => {
    expect(parse("select   1;")).toEqual(["select 1"]);
    expect(parse("select\t\n1;")).toEqual(["select 1"]);
  });

  it("leading/trailing whitespace is trimmed from each statement", () => {
    expect(parse("  select 1  ;")).toEqual(["select 1"]);
  });

  it("double semicolon emits empty string for the second semicolon (matches Kotlin behaviour)", () => {
    // Filtering empties is the caller's responsibility (migration runner skips them)
    const stmts = parse("select 1;;");
    expect(stmts).toEqual(["select 1", ""]);
  });

  it("line comment at end of file with no trailing newline", () => {
    expect(parse("select 1; -- trailing comment")).toEqual(["select 1"]);
  });

  it("block comment not closed (malformed) — consumes to end", () => {
    expect(parse("/* unclosed")).toEqual([]);
  });

  it("string with escaped quote pair stays in STRING state correctly", () => {
    // SQLite uses '' to escape a quote inside a string
    expect(parse("select 'it''s' as s;")).toEqual(["select 'it''s' as s"]);
  });
});

describe("parse — all 17 migration files produce non-empty statement arrays", () => {
  const migrations: [string, string][] = [
    ["09", m09],
    ["10", m10],
    ["11", m11],
    ["12", m12],
    ["13", m13],
    ["14", m14],
    ["15", m15],
    ["16", m16],
    ["17", m17],
    ["18", m18],
    ["19", m19],
    ["20", m20],
    ["21", m21],
    ["22", m22],
    ["23", m23],
    ["24", m24],
    ["25", m25],
  ];

  for (const [name, sql] of migrations) {
    it(`${name}.sql yields at least one statement`, () => {
      const stmts = parse(sql);
      expect(stmts.length).toBeGreaterThan(0);
      for (const s of stmts) {
        expect(s.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("parse — structural checks on key migration files", () => {
  it("09.sql yields exactly 5 CREATE TABLE statements", () => {
    const stmts = parse(m09);
    expect(stmts).toHaveLength(5);
    for (const s of stmts) {
      expect(s.toLowerCase()).toMatch(/^create table/);
    }
  });

  it("25.sql yields exactly 1 ALTER TABLE statement", () => {
    const stmts = parse(m25);
    expect(stmts).toHaveLength(1);
    expect(stmts[0].toLowerCase()).toMatch(/^alter table/);
  });

  it("22.sql yields 13 statements (cleanup DELETEs + embedded transaction + PRAGMA)", () => {
    const stmts = parse(m22);
    expect(stmts).toHaveLength(13);
  });

  it("18.sql string literal default value does not confuse parser", () => {
    // 18.sql contains `default ""` — empty string literal
    const stmts = parse(m18);
    expect(stmts).toHaveLength(3);
  });
});
