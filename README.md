# FAReality

3D and AR for furniture companies in Azerbaijan. Each company's products get
true-to-size 3D models that customers can spin in the browser and place in
their own room with their phone (iPhone and Android). There's no checkout:
customers contact the company directly over WhatsApp or by phone.

## Getting started

Requires Node 20.9+. You don't need to install Postgres or Docker.

```bash
npm install
cp .env.example .env && cp apps/web/.env.example apps/web/.env

npm run db:start     # real Postgres via npm, keep this running in its own terminal
npm run db:migrate
npm run db:seed      # demo companies + the legacy models, run through the pipeline
npm run dev          # http://localhost:3000
```

To try AR on a phone, set `SITE_URL` in `apps/web/.env` to your machine's LAN
address (e.g. `http://192.168.1.20:3000`) and open it on the phone. The QR
code on product pages uses that address.

## Layout

```
apps/web                  Next.js 16 site: catalog, company pages, product pages, embed
packages/db               Drizzle schema, migrations, seed, local Postgres
packages/asset-pipeline   Turns any source model into a web/AR-ready GLB + QA report
assets/source             Demo source models (.glb + .blend) and their posters
```

## Pages

| URL | What |
| --- | --- |
| `/az`, `/ru`, `/en` | Home: 3D hero, catalog with a "fits my space" filter, a section for companies |
| `/[locale]/brands/[company]` | A company's page and products |
| `/[locale]/brands/[company]/[product]` | Product: 3D with dimension lines, AR, WhatsApp/call, JSON-LD |
| `/[locale]/embed/[productId]` | Bare viewer for an iframe on a company's own website |
| `/[locale]/labels/[company]` | Printable A4 showroom price tags with QR codes (not linked yet, will move into the dashboard) |
| `/admin` | Team-only: upload, review and publish models (see below) |
| `opengraph-image`, `sitemap.xml`, `robots.txt` | Link previews for WhatsApp/Instagram/Telegram, plus SEO |

Link previews use static TTF instances of Onest in `apps/web/assets/fonts` (the OG renderer reads neither woff2 nor variable fonts). To regenerate them: `fonttools varLib.instancer "Onest[wght].ttf" wght=600 -o Onest-600.ttf`.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Web app | Next.js 16 (App Router, Cache Components) | Catalog pages are prerendered and cached, so they're fast on mobile data |
| 3D viewer + AR | `<model-viewer>` (built on three.js) | One tag covers Android (Scene Viewer / WebXR) and iPhone (AR Quick Look). iOS Safari still has no WebXR AR, so the old three.js WebXR viewer never worked on iPhones |
| Room planner (later) | React Three Fiber (three.js) | For a free-form scene with several objects |
| Database | PostgreSQL + Drizzle ORM | Multi-tenant: every row hangs off a company |
| Asset pipeline | glTF-Transform, meshoptimizer, Draco, sharp | Scales the model to the real size, puts it on the floor, compresses it, validates it |
| i18n | Next's built-in `[locale]` routing + dictionaries | az (default), ru, en |

## Design

- Tokens (colours, fonts) live in [apps/web/src/app/globals.css](apps/web/src/app/globals.css): warm linen background, ink text, cobalt accent from the logo. Onest for text, JetBrains Mono for measurements and labels. Both cover Azerbaijani and Cyrillic.
- The visual motif is measurement, because the product's promise is "will it fit?". The 3D stage has a faint measuring grid, sizes are set in mono, and [ModelViewer](apps/web/src/components/ModelViewer.tsx) draws the real dimensions over the model like a technical drawing. The lines follow the model and switch to whichever sides the camera sees.

## 3D models: where they come from

The source can be anything. Every model goes through the same pipeline and the
same human review before customers see it.

| Source | Good for | Watch out for |
| --- | --- | --- |
| Company CAD exports (Bazis, PRO100, SketchUp, 3ds Max) | Cabinets, wardrobes, kitchens. Most accurate, nearly free | Needs material/texture cleanup |
| 3D artist (Blender), from photos + dimensions | Hero products, upholstery | Cost per model |
| Photogrammetry (RealityScan, Polycam, Object Capture) | Textured pieces: sofas, wood tables | Glossy, white and glass surfaces scan poorly |
| AI image-to-3D (TRELLIS.2, Hunyuan3D, Meshy, Tripo, Rodin) | Fast drafts, sales demos, decor | Wrong scale, invented back sides, weak thin parts (legs, handles): always review |
| Stock libraries (Sketchfab, CGTrader) | Room decor only | Not the company's real product; check the licence |

Upholstery and most stock models aren't modular, but wardrobes and kitchens
are. Those can later be generated parametrically from dimensions, the way the
IKEA PAX planner works.

### Asset pipeline

```bash
npm run assets -- path/to/source.glb out/model.glb --width 228 --depth 43 --height 78
```

It writes `out/model.glb` and `out/model.glb.report.json`. The pipeline:

- scales the model to the declared size in cm and flags proportions that are off by more than 5%
- detects models exported facing sideways and turns them 90° (override with `--rotate-y`)
- moves the model so it stands on the floor at the origin, which AR placement relies on
- dedups, joins and welds the geometry, simplifies it above 150k triangles, converts textures to WebP (max 2048 px), then applies Draco compression
- validates the result with the Khronos glTF validator

A model is `publishable` only with zero validation errors and zero warnings.
Anything else waits for a human.

## Admin (team only)

`/admin` is where the team uploads and publishes models. Set `ADMIN_PASSWORD` in `apps/web/.env`; the admin is off while it's empty. It's one shared password with a signed 14-day cookie, and changing the password signs everyone out.

1. **Yeni məhsul**: upload a `.glb`, enter the real size, company (or a new one), category, names and price.
2. The server keeps the original upload, then runs the asset pipeline: scale, orientation, floor, compression, validation.
3. **Review**: the model with dimension lines and the pipeline report. If the front is wrong, turn it 90°/180°/270° (it re-processes the original).
4. **Təsdiqlə və yayımla**: the browser captures the poster and the product goes live (`updateTag('products')`).

After a laptop sleeps, restart `next start` before publishing. Next checks cache tag expiry with a clock (`performance.now()`) that stops during suspend, so published changes wouldn't show until the restart. Servers don't sleep, so production isn't affected.

Uploads live in `.data/storage` (`STORAGE_DIR`): `private/originals/…` is never served, and `public/models/…` is served by `/files/…` with immutable caching, since every version gets a new key. `src/lib/storage.ts` is the only file to change when moving to Cloudflare R2.

## Blender add-on

`tools/blender/fareality_export` adds a **FAReality** tab to Blender's sidebar (3D Viewport → N). Enter the product's real size, select the product's objects, then press **Yoxla** (check) or **GLB export**. Export refuses to run while there are errors. The checks mirror the asset pipeline:

- size matches the declared dimensions (±5%), and catches models built facing sideways or in cm/mm
- standing on the floor (Z = 0), scene units metric, scale applied
- at most 150k triangles
- materials are Principled BSDF, with no procedural textures (glTF can't carry them; bake them) and no missing image files

Front faces −Y in Blender (Numpad 1 shows it), which the glTF exporter turns into the platform's +Z.

```bash
npm run blender:build   # → tools/blender/dist/fareality_export-<version>.zip
npm run blender:test    # headless tests; set BLENDER=/path/to/blender if it isn't on PATH
```

Install the zip with Edit → Preferences → Get Extensions → ⌄ → Install from Disk (Blender 4.2+). On older Blender, copy the `fareality_export` folder into your `scripts/addons` directory.

## Roadmap

1. **Company dashboard.** Auth with company accounts (Better Auth organizations), product CRUD, model upload → pipeline in a background job → review screen → publish. The review screen also captures the poster in the browser with `model-viewer.toBlob()`.
2. **Storage.** Move models from `public/models` to S3-compatible storage (Cloudflare R2: no egress fees, which matters for heavy 3D files). Self-host the Draco decoder.
3. **Material variants.** One model with several fabrics or colours via `KHR_materials_variants`, which model-viewer can switch between.
4. **Analytics for companies.** Views, AR opens and WhatsApp clicks per product. This is the number that justifies the subscription.
5. **Room planner.** React Three Fiber; place several products in a room.
6. **Billing.** Check Stripe availability for an Azerbaijani entity. Otherwise use a local gateway or invoices.
