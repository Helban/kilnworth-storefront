// The part of Cloudflare's D1Database the store uses. D1 satisfies it in production; tests pass a
// node:sqlite adapter (test/sqlite-database.ts) so the same SQL runs locally.
export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  // Runs the statements in one transaction. If one fails, none of them apply.
  batch(statements: SqlStatement[]): Promise<SqlRunResult[]>;
}

export interface SqlStatement {
  bind(...values: SqlValue[]): SqlStatement;
  first<Row = Record<string, unknown>>(): Promise<Row | null>;
  all<Row = Record<string, unknown>>(): Promise<{ results: Row[] }>;
  run(): Promise<SqlRunResult>;
}

export interface SqlRunResult {
  meta: { changes: number };
}

export type SqlValue = string | number | null;
