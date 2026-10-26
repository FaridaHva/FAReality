import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './client';

await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
console.log('Migrations applied.');
await sql.end();
