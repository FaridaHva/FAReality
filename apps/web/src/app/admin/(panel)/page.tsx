import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { listProducts } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Məhsullar" };

export default function AdminHome() {
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Məhsullar</h1>
        <Link
          href="/admin/new"
          className="flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85"
        >
          <Plus className="size-4" strokeWidth={2} />
          Yeni məhsul
        </Link>
      </div>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-3xl bg-surface" />}>
        <ProductTable />
      </Suspense>
    </>
  );
}

async function ProductTable() {
  await requireAdmin();
  const rows = await listProducts();
  if (rows.length === 0) return <p className="mt-8 text-muted">Hələ məhsul yoxdur.</p>;

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-normal">Məhsul</th>
            <th className="px-4 py-3 font-normal">Status</th>
            <th className="px-4 py-3 font-normal">3D model</th>
            <th className="hidden px-4 py-3 font-normal sm:table-cell">Xəbərdarlıq</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ product, company, model }) => (
            <tr key={product.id} className="hover:bg-bg">
              <td className="px-4 py-3">
                <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-tile">
                    {model?.posterUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={model.posterUrl} alt="" className="size-full object-contain" />
                    )}
                  </span>
                  <span>
                    <span className="block font-medium">{product.name.az}</span>
                    <span className="block text-muted">{company.name}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={product.status} />
              </td>
              <td className="px-4 py-3">{model ? <StatusBadge status={model.status} /> : "—"}</td>
              <td className="hidden px-4 py-3 font-mono text-xs text-muted sm:table-cell">
                {model?.report ? model.report.warnings.length + model.report.validation.errors : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
