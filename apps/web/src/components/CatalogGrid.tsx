"use client";

import { Ruler, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { fill } from "@/i18n/config";

type Size = { width: number | null; depth: number | null; height: number | null };
const AXES = ["width", "depth", "height"] as const;

export interface CatalogItem {
  id: string;
  category: string | null;
  size: Size;
  /** Rendered on the server, so prices and text format identically everywhere. */
  card: ReactNode;
}

interface Labels {
  all: string;
  empty: string;
  fit: { toggle: string; hint: string; width: string; depth: string; height: string; clear: string; count: string; none: string };
}

/**
 * Product grid with category chips and a "fits my space" filter: the visitor
 * types the free space they have, and only pieces that fit stay. Filters in
 * the browser — fine while catalogs are small.
 */
export function CatalogGrid({
  items,
  categories,
  labels,
}: {
  items: CatalogItem[];
  categories: { slug: string; name: string }[];
  labels: Labels;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [fitOpen, setFitOpen] = useState(false);
  const [space, setSpace] = useState<Record<(typeof AXES)[number], string>>({ width: "", depth: "", height: "" });

  const limits = AXES.map((axis) => [axis, Number(space[axis]) || null] as const);
  const fitActive = fitOpen && limits.some(([, max]) => max);
  // Width is along the wall, so we don't turn pieces to make them fit.
  const fits = (size: Size) => limits.every(([axis, max]) => !max || (size[axis] !== null && size[axis] <= max));

  const inCategory = category ? items.filter((item) => item.category === category) : items;
  const visible = fitActive ? inCategory.filter((item) => fits(item.size)) : inCategory;

  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
      active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink/40"
    }`;

  return (
    <>
      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
            fitOpen ? "border-accent bg-accent text-white" : "border-accent/40 bg-surface text-accent hover:border-accent"
          }`}
          onClick={() => setFitOpen((open) => !open)}
          aria-expanded={fitOpen}
        >
          <Ruler className="size-4" strokeWidth={1.75} />
          {labels.fit.toggle}
        </button>
        {categories.length > 1 && (
          <>
            <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
            <button type="button" className={chip(category === null)} onClick={() => setCategory(null)}>
              {labels.all}
            </button>
            {categories.map(({ slug, name }) => (
              <button key={slug} type="button" className={chip(category === slug)} onClick={() => setCategory(slug)}>
                {name}
              </button>
            ))}
          </>
        )}
      </div>

      {fitOpen && (
        <div className="stage mt-4 flex flex-wrap items-end gap-4 rounded-3xl p-5">
          <p className="w-full text-sm text-ink/75">{labels.fit.hint}</p>
          {AXES.map((axis) => (
            <label key={axis} className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{labels.fit[axis]}</span>
              <span className="flex items-center rounded-xl border border-line bg-surface pr-3 focus-within:border-ink">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={space[axis]}
                  onChange={(e) => setSpace((s) => ({ ...s, [axis]: e.target.value }))}
                  placeholder="—"
                  className="w-24 bg-transparent px-3 py-2.5 font-mono text-lg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="font-mono text-sm text-muted">cm</span>
              </span>
            </label>
          ))}
          {fitActive && (
            <div className="flex items-center gap-3 pb-2.5">
              <span className="font-mono text-sm text-accent">
                {fill(labels.fit.count, { count: String(visible.length) })}
              </span>
              <button
                type="button"
                onClick={() => setSpace({ width: "", depth: "", height: "" })}
                className="flex items-center gap-1 text-sm text-muted transition hover:text-ink"
              >
                <X className="size-3.5" strokeWidth={2} />
                {labels.fit.clear}
              </button>
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-10 text-muted">{fitActive ? labels.fit.none : labels.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <div key={item.id}>{item.card}</div>
          ))}
        </div>
      )}
    </>
  );
}
