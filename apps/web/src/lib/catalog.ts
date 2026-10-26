/**
 * Public catalog reads. Cached and tagged so pages are served from the static
 * shell; when a company edits a product, `revalidateTag('products')` refreshes them.
 */
import { categories, companies, db, productModels, products } from "@fareality/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

/** Newest approved model per product. */
const latestModel = db
  .selectDistinctOn([productModels.productId], {
    productId: productModels.productId,
    glbUrl: productModels.glbUrl,
    usdzUrl: productModels.usdzUrl,
    posterUrl: productModels.posterUrl,
  })
  .from(productModels)
  .where(eq(productModels.status, "ready"))
  .orderBy(productModels.productId, desc(productModels.createdAt))
  .as("latest_model");

function selectProducts() {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      priceAzn: products.priceAzn,
      widthCm: products.widthCm,
      depthCm: products.depthCm,
      heightCm: products.heightCm,
      updatedAt: products.updatedAt,
      company: {
        id: companies.id,
        slug: companies.slug,
        name: companies.name,
        city: companies.city,
        phone: companies.phone,
        whatsapp: companies.whatsapp,
      },
      category: { slug: categories.slug, name: categories.name },
      model: { glbUrl: latestModel.glbUrl, usdzUrl: latestModel.usdzUrl, posterUrl: latestModel.posterUrl },
    })
    .from(products)
    .innerJoin(companies, eq(companies.id, products.companyId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(latestModel, eq(latestModel.productId, products.id))
    .$dynamic();
}

export type CatalogProduct = Awaited<ReturnType<typeof getPublishedProducts>>[number];

const published = eq(products.status, "published");

export async function getPublishedProducts() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return selectProducts().where(published).orderBy(desc(products.createdAt));
}

/** Home page hero: our pick, else the newest product that has a 3D model. */
export async function getFeaturedProduct() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const [row] = await selectProducts()
    .where(and(published, isNotNull(latestModel.glbUrl)))
    .orderBy(desc(products.featured), desc(products.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getProduct(companySlug: string, productSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const [row] = await selectProducts()
    .where(and(published, eq(companies.slug, companySlug), eq(products.slug, productSlug)))
    .limit(1);
  return row ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProductById(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  if (!UUID.test(id)) return null;
  const [row] = await selectProducts().where(and(published, eq(products.id, id))).limit(1);
  return row ?? null;
}

export async function getCompany(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("companies");
  const [row] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return row ?? null;
}

export async function getCompanyProducts(companySlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return selectProducts()
    .where(and(published, eq(companies.slug, companySlug)))
    .orderBy(desc(products.createdAt));
}
