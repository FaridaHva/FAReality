"use server";

import { randomUUID } from "node:crypto";
import { processModel, type AssetReport } from "@fareality/asset-pipeline";
import { companies, db, modelSource, productModels, products, type Localized } from "@fareality/db";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getProductForReview } from "@/lib/admin/data";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/admin/session";
import { slugify, uniqueSlug } from "@/lib/slug";
import { fileUrl, putFile, storagePath } from "@/lib/storage";

export type FormState = { error?: string } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD təyin edilməyib (apps/web/.env)." };
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return { error: "Şifrə yanlışdır." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

function localized(form: FormData, name: string): Localized | null {
  const az = text(form, `${name}_az`);
  if (!az) return null;
  return { az, ru: text(form, `${name}_ru`) || undefined, en: text(form, `${name}_en`) || undefined };
}

function positive(form: FormData, name: string): number | null {
  const n = Number(text(form, name));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Where a model version's files live; the id keeps every version's URL unique (and cacheable). */
const modelKey = (company: string, product: string, modelId: string, ext: "glb" | "webp") =>
  `models/${company}/${product}-${modelId.slice(0, 8)}.${ext}`;

export async function createProduct(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const file = form.get("model");
  if (!(file instanceof File) || file.size === 0) return { error: "3D model faylını seçin." };
  if (!file.name.toLowerCase().endsWith(".glb")) return { error: "Yalnız .glb faylı qəbul olunur (Blender: glTF Binary)." };

  const name = localized(form, "name");
  if (!name) return { error: "Məhsulun azərbaycanca adı lazımdır." };
  const width = positive(form, "width"), depth = positive(form, "depth"), height = positive(form, "height");
  if (!width || !depth || !height) return { error: "En, dərinlik və hündürlük (sm) lazımdır." };
  const source = text(form, "source") as (typeof modelSource.enumValues)[number];
  if (!modelSource.enumValues.includes(source)) return { error: "Modelin mənbəyini seçin." };
  const price = text(form, "price");
  if (price && !(Number(price) > 0)) return { error: "Qiymət müsbət rəqəm olmalıdır." };

  // An existing company, or a new one typed into the form — inserted only once the model has processed.
  let company: { id: string | null; slug: string } | undefined;
  let newCompany: typeof companies.$inferInsert | undefined;
  const companyId = text(form, "companyId");
  if (companyId === "new") {
    const companyName = text(form, "companyName");
    if (!companyName) return { error: "Yeni şirkətin adını yazın." };
    const takenCompanies = (await db.select({ slug: companies.slug }).from(companies)).map((c) => c.slug);
    newCompany = {
      name: companyName,
      slug: uniqueSlug(slugify(companyName), takenCompanies),
      city: text(form, "companyCity") || null,
      whatsapp: text(form, "companyWhatsapp").replace(/\D/g, "") || null,
      phone: text(form, "companyPhone") || null,
    };
    company = { id: null, slug: newCompany.slug };
  } else if (companyId) {
    [company] = await db
      .select({ id: companies.id, slug: companies.slug })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
  }
  if (!company) return { error: "Şirkəti seçin." };

  const taken = company.id
    ? (await db.select({ slug: products.slug }).from(products).where(eq(products.companyId, company.id))).map((p) => p.slug)
    : [];
  const slug = uniqueSlug(slugify(name.az), taken);

  // Keep the original so the model can be re-processed (e.g. turned) later.
  const originalKey = `originals/${randomUUID()}.glb`;
  await putFile("private", originalKey, new Uint8Array(await file.arrayBuffer()));

  const modelId = randomUUID();
  const glbKey = modelKey(company.slug, slug, modelId, "glb");
  let report: AssetReport;
  try {
    report = await processModel({
      input: storagePath("private", originalKey),
      output: storagePath("public", glbKey),
      dimensions: { width, depth, height },
    });
  } catch (e) {
    return { error: `Modeli emal etmək olmadı: ${e instanceof Error ? e.message : e}` };
  }

  if (newCompany) [{ id: company.id }] = await db.insert(companies).values(newCompany).returning({ id: companies.id });

  const [product] = await db
    .insert(products)
    .values({
      companyId: company.id!,
      categoryId: text(form, "categoryId") || null,
      slug,
      name,
      description: localized(form, "description"),
      priceAzn: price || null,
      widthCm: width,
      depthCm: depth,
      heightCm: height,
      status: "draft",
    })
    .returning({ id: products.id });

  await db.insert(productModels).values({
    id: modelId,
    productId: product.id,
    source,
    status: "needs_review",
    sourceUrl: originalKey,
    glbUrl: fileUrl(glbKey),
    report,
  });

  redirect(`/admin/products/${product.id}`);
}

/** Re-runs the pipeline on the original, turned further by `degrees`. Creates a new model version. */
export async function turnModel(productId: string, degrees: number) {
  await requireAdmin();
  const data = await getProductForReview(productId);
  if (!data?.model) return;
  const { product, company, model } = data;

  const rotateY = ((model.report?.rotateYApplied ?? 0) + degrees) % 360;
  const modelId = randomUUID();
  const glbKey = modelKey(company.slug, product.slug, modelId, "glb");
  const report = await processModel({
    input: storagePath("private", model.sourceUrl),
    output: storagePath("public", glbKey),
    dimensions: { width: product.widthCm!, depth: product.depthCm!, height: product.heightCm! },
    rotateY,
  });
  await db.insert(productModels).values({
    id: modelId,
    productId,
    source: model.source,
    status: "needs_review",
    sourceUrl: model.sourceUrl,
    glbUrl: fileUrl(glbKey),
    report,
  });
  redirect(`/admin/products/${productId}`);
}

/** Approves the newest model with the poster the browser captured, and puts the product live. */
export async function publishProduct(productId: string, form: FormData): Promise<FormState> {
  await requireAdmin();
  const data = await getProductForReview(productId);
  if (!data?.model?.glbUrl) return { error: "Model tapılmadı." };
  const { product, company, model } = data;

  const poster = form.get("poster");
  let posterUrl = model.posterUrl;
  if (poster instanceof File && poster.size > 0) {
    const key = modelKey(company.slug, product.slug, model.id, "webp");
    await putFile("public", key, new Uint8Array(await poster.arrayBuffer()));
    posterUrl = fileUrl(key);
  }

  await db.update(productModels).set({ status: "ready", posterUrl }).where(eq(productModels.id, model.id));
  await db.update(products).set({ status: "published" }).where(eq(products.id, productId));
  updateTag("products");
  updateTag("companies");
  redirect(`/admin/products/${productId}`);
}

export async function unpublishProduct(productId: string) {
  await requireAdmin();
  await db.update(products).set({ status: "draft" }).where(eq(products.id, productId));
  updateTag("products");
  redirect(`/admin/products/${productId}`);
}
