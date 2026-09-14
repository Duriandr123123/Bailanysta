import { env } from "cloudflare:workers";
export function db(): D1Database {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
export function bucket(): R2Bucket {
  if (!env.BUCKET) throw new Error("Storage unavailable");
  return env.BUCKET;
}
export async function all<T = Record<string, unknown>>(
  sql: string,
  ...values: unknown[]
): Promise<T[]> {
  return (
    await db()
      .prepare(sql)
      .bind(...values)
      .all<T>()
  ).results;
}
export async function one<T = Record<string, unknown>>(
  sql: string,
  ...values: unknown[]
): Promise<T | null> {
  return db()
    .prepare(sql)
    .bind(...values)
    .first<T>();
}
export async function run(sql: string, ...values: unknown[]) {
  return db()
    .prepare(sql)
    .bind(...values)
    .run();
}
export const uid = () => crypto.randomUUID();
