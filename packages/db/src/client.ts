import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (copy .env.example to .env)');

// Reuse one pool across dev hot reloads instead of leaking a new one per edit.
const cache = globalThis as unknown as { fareality_sql?: postgres.Sql };
export const sql = cache.fareality_sql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== 'production') cache.fareality_sql = sql;

export const db = drizzle(sql, { schema, casing: 'snake_case' });
