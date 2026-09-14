import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = process.cwd();
mkdirSync(".sites-runtime", { recursive: true });
const config = {
  name: "bailanysta-local",
  compatibility_date: "2026-05-15",
  d1_databases: [
    {
      binding: "DB",
      database_name: "site-creator-d1",
      database_id: "00000000-0000-4000-8000-000000000000",
      migrations_dir: path.join(root, "drizzle"),
    },
  ],
};
writeFileSync(".sites-runtime/local-migrations.json", JSON.stringify(config));
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    ".sites-runtime/local-migrations.json",
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
