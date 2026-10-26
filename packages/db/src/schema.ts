import type { AssetReport } from '@fareality/asset-pipeline';
import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Customer-facing text. Azerbaijani is required; Russian and English fall back to it. */
export type Localized = { az: string; ru?: string; en?: string };

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** A furniture company — the tenant. Everything they own hangs off this row. */
export const companies = pgTable('companies', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: jsonb().$type<Localized>(),
  logoUrl: text(),
  city: text(),
  address: text(),
  phone: text(),
  /** International format without "+", e.g. 994501234567 — used for wa.me links. */
  whatsapp: text(),
  instagram: text(),
  website: text(),
  ...timestamps,
});

export const categories = pgTable('categories', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: jsonb().$type<Localized>().notNull(),
  sortOrder: integer().notNull().default(0),
});

export const productStatus = pgEnum('product_status', ['draft', 'published', 'archived']);

export const products = pgTable(
  'products',
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    categoryId: uuid().references(() => categories.id, { onDelete: 'set null' }),
    slug: text().notNull(),
    name: jsonb().$type<Localized>().notNull(),
    description: jsonb().$type<Localized>(),
    /** Null means "price on request". */
    priceAzn: numeric({ precision: 10, scale: 2 }),
    /** Real size in cm; the 3D model is scaled to match, so AR is true to life. */
    widthCm: integer(),
    depthCm: integer(),
    heightCm: integer(),
    status: productStatus().notNull().default('draft'),
    /** Picked by us for the home page hero. */
    featured: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.companyId, t.slug), index().on(t.status)],
);

/** Where a model came from — they need different QA (AI drafts most of all). */
export const modelSource = pgEnum('model_source', ['cad', 'scan', 'ai', 'artist', 'library']);

export const modelStatus = pgEnum('model_status', ['processing', 'needs_review', 'ready', 'failed']);

/**
 * Every upload is kept as a new row, so a product can be re-processed or
 * rolled back. The newest `ready` row is the one shown to customers.
 */
export const productModels = pgTable(
  'product_models',
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    source: modelSource().notNull(),
    status: modelStatus().notNull().default('processing'),
    /** The original upload, kept so the pipeline can be re-run with better settings. */
    sourceUrl: text().notNull(),
    glbUrl: text(),
    /** Optional pre-built iOS file; without it model-viewer converts the GLB on the device. */
    usdzUrl: text(),
    posterUrl: text(),
    report: jsonb().$type<AssetReport>(),
    ...timestamps,
  },
  (t) => [index().on(t.productId, t.status)],
);
