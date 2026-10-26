/**
 * Real Postgres for local development, downloaded through npm — no system
 * install, Docker or sudo. Data lives in <repo>/.data/postgres.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const { hostname, port, username, password } = new URL(process.env.DATABASE_URL!);
if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
  throw new Error(`DATABASE_URL points at ${hostname}; the dev server only runs locally.`);
}

const databaseDir = path.resolve(import.meta.dirname, '../../../.data/postgres');
const pg = new EmbeddedPostgres({ databaseDir, port: Number(port), user: username, password, persistent: true });

if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
console.log(`Postgres running on port ${port} (data: ${databaseDir}). Ctrl+C to stop.`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
}
