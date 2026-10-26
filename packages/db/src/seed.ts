/**
 * Dev-only: wipes the catalog and refills it with demo companies, running the
 * legacy models through the asset pipeline into apps/web/public/models.
 */
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { processModel, type Dimensions } from '@fareality/asset-pipeline';
import { db, sql } from './client';
import { categories, companies, productModels, products, type Localized } from './schema';

if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed a production database.');

const repo = path.resolve(import.meta.dirname, '../../..');
const publicDir = path.join(repo, 'apps/web/public');

const CATEGORIES: { slug: string; name: Localized }[] = [
  { slug: 'sofas', name: { az: 'Divanlar', ru: 'Диваны', en: 'Sofas' } },
  { slug: 'armchairs', name: { az: 'Kreslolar', ru: 'Кресла', en: 'Armchairs' } },
  { slug: 'tv-units', name: { az: 'TV stendləri', ru: 'ТВ-тумбы', en: 'TV units' } },
  { slug: 'storage', name: { az: 'Komodlar və şkaflar', ru: 'Комоды и шкафы', en: 'Storage' } },
  { slug: 'beds', name: { az: 'Çarpayılar', ru: 'Кровати', en: 'Beds' } },
  { slug: 'tables', name: { az: 'Masalar', ru: 'Столы', en: 'Tables' } },
  { slug: 'chairs', name: { az: 'Stullar', ru: 'Стулья', en: 'Chairs' } },
  { slug: 'kitchens', name: { az: 'Mətbəx mebeli', ru: 'Кухни', en: 'Kitchens' } },
];

// Fictional companies — never seed real brand names.
const COMPANIES = [
  {
    slug: 'demo-mebel',
    name: 'Demo Mebel',
    city: 'Bakı',
    whatsapp: '994500000000',
    description: {
      az: 'Demo şirkət: platformanın necə işlədiyini göstərmək üçün.',
      ru: 'Демо-компания для показа возможностей платформы.',
      en: 'Demo company used to show how the platform works.',
    },
  },
  {
    slug: 'ev-studio-demo',
    name: 'Ev Studio (demo)',
    city: 'Gəncə',
    whatsapp: '994550000000',
    description: {
      az: 'İkinci demo şirkət.',
      ru: 'Вторая демо-компания.',
      en: 'A second demo company.',
    },
  },
];

const PRODUCTS: {
  company: string;
  category: string;
  slug: string;
  name: Localized;
  description: Localized;
  priceAzn: string | null;
  featured?: boolean;
  dimensions: Dimensions;
  /** Source folder holding model.glb and poster.webp. */
  source: string;
}[] = [
  {
    company: 'demo-mebel',
    category: 'tv-units',
    slug: 'nova-tv-stend',
    name: { az: 'Nova TV stendi', ru: 'ТВ-тумба Nova', en: 'Nova TV stand' },
    description: {
      az: 'Ağ fasadlı, geniş və alçaq TV stendi.',
      ru: 'Широкая низкая ТВ-тумба с белым фасадом.',
      en: 'A wide, low TV stand with a white front.',
    },
    priceAzn: '420.00',
    dimensions: { width: 228, depth: 43, height: 78 },
    source: 'assets/source/av-cabinet',
  },
  {
    company: 'demo-mebel',
    category: 'sofas',
    slug: 'flora-divan',
    name: { az: 'Flora divanı', ru: 'Диван Flora', en: 'Flora sofa' },
    description: {
      az: 'Kiçik qonaq otağı üçün iki yerlik parça divan.',
      ru: 'Двухместный тканевый диван для небольшой гостиной.',
      en: 'A two-seat fabric sofa for smaller living rooms.',
    },
    priceAzn: '1150.00',
    featured: true,
    dimensions: { width: 165, depth: 62, height: 65 },
    source: 'assets/source/flora-sofa',
  },
  {
    company: 'ev-studio-demo',
    category: 'storage',
    slug: 'arda-komod',
    name: { az: 'Arda komodu', ru: 'Комод Arda', en: 'Arda chest of drawers' },
    description: {
      az: 'Taxta fakturalı, dar komod.',
      ru: 'Узкий комод с текстурой дерева.',
      en: 'A narrow chest of drawers with a wood finish.',
    },
    priceAzn: null,
    dimensions: { width: 52, depth: 29, height: 82 },
    source: 'assets/source/drawer-cabinet',
  },
];

await db.delete(companies); // cascades to products and models
await db.delete(categories);

const categoryIds = new Map(
  (await db.insert(categories).values(CATEGORIES.map((c, i) => ({ ...c, sortOrder: i }))).returning()).map((c) => [
    c.slug,
    c.id,
  ]),
);
const companyIds = new Map((await db.insert(companies).values(COMPANIES).returning()).map((c) => [c.slug, c.id]));

for (const p of PRODUCTS) {
  const [product] = await db
    .insert(products)
    .values({
      companyId: companyIds.get(p.company)!,
      categoryId: categoryIds.get(p.category)!,
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceAzn: p.priceAzn,
      widthCm: p.dimensions.width,
      depthCm: p.dimensions.depth,
      heightCm: p.dimensions.height,
      status: 'published',
      featured: p.featured ?? false,
    })
    .returning();

  const glbUrl = `/models/${p.company}/${p.slug}.glb`;
  const posterUrl = `/models/${p.company}/${p.slug}.webp`;
  const report = await processModel({
    input: path.join(repo, p.source, 'model.glb'),
    output: path.join(publicDir, glbUrl),
    dimensions: p.dimensions,
  });
  // Pre-rendered once; for real uploads the dashboard captures it in the browser.
  await copyFile(path.join(repo, p.source, 'poster.webp'), path.join(publicDir, posterUrl));

  await db.insert(productModels).values({
    productId: product.id,
    source: 'library',
    // Seed models count as reviewed; real uploads stop at needs_review until a human approves.
    status: report.validation.errors === 0 ? 'ready' : 'needs_review',
    sourceUrl: `${p.source}/model.glb`,
    glbUrl,
    posterUrl,
    report,
  });
  console.log(`${p.company}/${p.slug}: ${(report.outputBytes / 1024).toFixed(0)} KB`, report.warnings);
}

await sql.end();
