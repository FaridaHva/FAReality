"use client";

import { CheckCircle2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { publishProduct } from "@/app/admin/actions";
import { ModelViewer, type ModelViewerHandle } from "@/components/ModelViewer";

const LABELS = { viewInRoom: "Otağında bax", dragHint: "Fırlatmaq üçün sürüşdür", dimensions: "Ölçülər", fullscreen: "Tam ekran" };

/** The model as customers will see it, plus the publish button (which needs the viewer to take the poster). */
export function ReviewStage({
  productId,
  glbUrl,
  name,
  size,
  canPublish,
}: {
  productId: string;
  glbUrl: string;
  name: string;
  size: { width: number | null; depth: number | null; height: number | null };
  canPublish: boolean;
}) {
  const viewer = useRef<ModelViewerHandle>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const publish = () =>
    startTransition(async () => {
      setError(undefined);
      const form = new FormData();
      try {
        form.append("poster", await viewer.current!.capturePoster(), "poster.webp");
      } catch {
        // Publish anyway; the catalog falls back to a placeholder without a poster.
      }
      const result = await publishProduct(productId, form);
      if (result?.error) setError(result.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="stage relative aspect-[4/3] overflow-hidden rounded-[2rem]">
        <ModelViewer ref={viewer} key={glbUrl} className="h-full w-full" src={glbUrl} alt={name} size={size} labels={LABELS} />
      </div>
      {canPublish && (
        <button
          type="button"
          onClick={publish}
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
        >
          <CheckCircle2 className="size-4" strokeWidth={2} />
          {pending ? "Poster çəkilir və yayımlanır…" : "Təsdiqlə və yayımla"}
        </button>
      )}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
