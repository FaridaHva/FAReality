import { ArrowUpRight, RotateCw } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { turnModel, unpublishProduct } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/forms";
import { ReviewStage } from "@/components/admin/ReviewStage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getProductForReview } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Yoxlama" };

export default function ReviewPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<div className="stage h-[60vh] animate-pulse rounded-[2rem]" />}>
      <Review params={params} />
    </Suspense>
  );
}

const kb = (bytes: number) => `${Math.round(bytes / 1024).toLocaleString("az")} KB`;

// The pipeline reports in English; the team reads Azerbaijani. Unknown messages pass through.
const WARNINGS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Model was exported facing sideways/, () => "Model yana dönük export edilib, 90° çevrildi. Ön tərəfin izləyiciyə baxdığını yoxlayın."],
  [/^Model proportions differ from the declared size by (\d+)%/, (m) => `Modelin proporsiyaları daxil edilən ölçüdən ${m[1]}% fərqlənir. Ölçüləri və ya fırlatmanı yoxlayın.`],
  [/^Simplified from (\d+) triangles/, (m) => `${m[1]} üçbucaqdan sadələşdirildi. Ayaq və qulp kimi incə hissələri yoxlayın.`],
  [/^No textures/, () => "Tekstura yoxdur, materiallar düz rəngdədir."],
  [/^Model has animations/, () => "Modeldə animasiya var, nəzərə alınmır."],
];

function translate(warning: string): string {
  for (const [pattern, toAz] of WARNINGS) {
    const match = warning.match(pattern);
    if (match) return toAz(match);
  }
  return warning;
}

async function Review({ params }: Pick<PageProps<"/admin/products/[id]">, "params">) {
  await requireAdmin();
  const data = await getProductForReview((await params).id);
  if (!data) notFound();
  const { product, company, model } = data;
  const report = model?.report;
  const published = product.status === "published";
  const live = model?.status === "ready";
  const siteUrl = `/az/brands/${company.slug}/${product.slug}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{company.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name.az}</h1>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={product.status} />
            {model && <StatusBadge status={model.status} />}
          </div>
        </div>
        {published && (
          <a href={siteUrl} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm text-accent hover:underline">
            Saytda bax <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>

      {!model?.glbUrl ? (
        <p className="mt-8 text-muted">Bu məhsulun 3D modeli yoxdur.</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <ReviewStage
            productId={product.id}
            glbUrl={model.glbUrl}
            name={product.name.az}
            size={{ width: product.widthCm, depth: product.depthCm, height: product.heightCm }}
            canPublish={!(published && live)}
          />

          <div className="flex flex-col gap-6">
            <section className="rounded-3xl border border-line bg-surface p-6">
              <h2 className="font-semibold">Ön tərəf düzgündür?</h2>
              <p className="mt-1 text-sm text-muted">
                Açılışda kamera məhsulun önünə, bir az soldan baxır. Ön tərəf görünmürsə, çevirin: model yenidən emal olunur.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[90, 180, 270].map((deg) => (
                  <form key={deg} action={turnModel.bind(null, product.id, deg)}>
                    <SubmitButton variant="secondary" pendingText="Emal olunur…">
                      <span className="flex items-center gap-1.5">
                        <RotateCw className="size-3.5" /> {deg}°
                      </span>
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </section>

            {report && (
              <section className="rounded-3xl border border-line bg-surface p-6">
                <h2 className="font-semibold">Pipeline hesabatı</h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-muted">Ölçü (model)</dt>
                  <dd className="font-mono">
                    {report.dimensions.width} × {report.dimensions.depth} × {report.dimensions.height} sm
                  </dd>
                  <dt className="text-muted">Üçbucaq</dt>
                  <dd className="font-mono">
                    {report.triangles.before.toLocaleString("az")} → {report.triangles.after.toLocaleString("az")}
                  </dd>
                  <dt className="text-muted">Fayl</dt>
                  <dd className="font-mono">
                    {kb(report.inputBytes)} → {kb(report.outputBytes)}
                  </dd>
                  <dt className="text-muted">Miqyas / fırlatma</dt>
                  <dd className="font-mono">
                    ×{report.scaleApplied.toFixed(3)} / {report.rotateYApplied}°
                  </dd>
                  <dt className="text-muted">Texniki yoxlama</dt>
                  <dd className="font-mono">
                    {report.validation.errors} xəta, {report.validation.warnings} xəbərdarlıq
                  </dd>
                </dl>
                {report.warnings.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                    {report.warnings.map((w) => (
                      <li key={w} className="flex gap-2 text-amber-800">
                        <span aria-hidden>⚠</span>
                        {translate(w)}
                      </li>
                    ))}
                  </ul>
                )}
                {report.validation.messages.length > 0 && (
                  <ul className="mt-4 space-y-1 border-t border-line pt-4 font-mono text-xs text-red-700">
                    {report.validation.messages.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {published && (
              <form action={unpublishProduct.bind(null, product.id)}>
                <SubmitButton variant="secondary" pendingText="…">
                  Yayımdan çıxar
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
