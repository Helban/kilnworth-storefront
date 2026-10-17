import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setImmediate } from "node:timers/promises";
import type { SqlDatabase, SqlRunResult, SqlStatement, SqlValue } from "@/lib/store/database";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations");

// An in-memory SQLite database with every migration applied, behind the same interface the store
// uses for D1. Each call yields to the event loop first, the way a D1 round trip would, so
// concurrent callers really do interleave between statements.
export function createTestDatabase(): SqlDatabase & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  return {
    sqlite,
    prepare: (sql) => new SqliteStatement(sqlite, sql, []),
    async batch(statements) {
      await setImmediate();
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => asSqliteStatement(statement).runNow());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

class SqliteStatement implements SqlStatement {
  constructor(
    private readonly sqlite: DatabaseSync,
    private readonly sql: string,
    private readonly values: SqlValue[],
  ) {}

  bind(...values: SqlValue[]): SqlStatement {
    return new SqliteStatement(this.sqlite, this.sql, values);
  }

  async first<Row>(): Promise<Row | null> {
    await setImmediate();
    return (this.sqlite.prepare(this.sql).get(...this.values) as Row | undefined) ?? null;
  }

  async all<Row>(): Promise<{ results: Row[] }> {
    await setImmediate();
    return { results: this.sqlite.prepare(this.sql).all(...this.values) as Row[] };
  }

  async run(): Promise<SqlRunResult> {
    await setImmediate();
    return this.runNow();
  }

  runNow(): SqlRunResult {
    const { changes } = this.sqlite.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(changes) } };
  }
}

function asSqliteStatement(statement: SqlStatement): SqliteStatement {
  if (!(statement instanceof SqliteStatement)) {
    throw new TypeError("batch() only accepts statements from the same test database");
  }
  return statement;
}
