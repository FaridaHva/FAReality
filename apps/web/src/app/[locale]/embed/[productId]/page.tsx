/**
 * Bare viewer that companies put on their own website:
 *   <iframe src="https://<our-domain>/az/embed/<productId>"
 *           allow="xr-spatial-tracking; fullscreen" style="width:100%;height:500px;border:0"></iframe>
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModelViewer } from "@/components/ModelViewer";
import { localized } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getProductById } from "@/lib/catalog";

type Props = PageProps<"/[locale]/embed/[productId]">;

export default function EmbedPage({ params }: Props) {
  return (
    <Suspense>
      <Embed params={params} />
    </Suspense>
  );
}

async function Embed({ params }: Pick<Props, "params">) {
  const { productId } = await params;
  const product = await getProductById(productId);
  if (!product?.model?.glbUrl) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <div className="stage relative h-dvh w-full">
      <ModelViewer
        className="h-full w-full"
        src={product.model.glbUrl}
        iosSrc={product.model.usdzUrl}
        poster={product.model.posterUrl}
        alt={localized(product.name, locale)}
        size={{ width: product.widthCm, depth: product.depthCm, height: product.heightCm }}
        labels={{
          viewInRoom: dict.product.viewInRoom,
          dragHint: dict.product.dragHint,
          dimensions: dict.product.dimensions,
          fullscreen: dict.product.fullscreen,
        }}
      />
      <a
        href={`/${locale}/brands/${product.company.slug}/${product.slug}`}
        target="_blank"
        rel="noopener"
        className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent"
      >
        {dict.embed.poweredBy}
      </a>
    </div>
  );
}
