/** Admin reads: uncached, every status — the team needs to see drafts and failures as they are. */
import { categories, companies, db, productModels, products } from "@fareality/db";
import { asc, desc, eq } from "drizzle-orm";

export async function listCompanies() {
  return db.select({ id: companies.id, name: companies.name, slug: companies.slug }).from(companies).orderBy(asc(companies.name));
}

export async function listCategories() {
  return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder));
}

/** Every product with its newest model, whatever the status. */
export async function listProducts() {
  const rows = await db
    .select({ product: products, company: { name: companies.name, slug: companies.slug }, model: productModels })
    .from(products)
    .innerJoin(companies, eq(companies.id, products.companyId))
    .leftJoin(productModels, eq(productModels.productId, products.id))
    .orderBy(desc(products.updatedAt), desc(productModels.createdAt));
  const newest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!newest.has(row.product.id)) newest.set(row.product.id, row);
  return [...newest.values()];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProductForReview(id: string) {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({ product: products, company: companies })
    .from(products)
    .innerJoin(companies, eq(companies.id, products.companyId))
    .where(eq(products.id, id))
    .limit(1);
  if (!row) return null;
  const [model] = await db
    .select()
    .from(productModels)
    .where(eq(productModels.productId, id))
    .orderBy(desc(productModels.createdAt))
    .limit(1);
  return { ...row, model: model ?? null };
}
