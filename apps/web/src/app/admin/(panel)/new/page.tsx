import type { Metadata } from "next";
import { Suspense } from "react";
import { NewProductForm } from "@/components/admin/NewProductForm";
import { listCategories, listCompanies } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Yeni məhsul" };

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Yeni məhsul</h1>
      <p className="mt-2 text-muted">
        Model yüklənəndən sonra avtomatik yoxlanılır və real ölçüyə gətirilir. Yayımdan əvvəl növbəti səhifədə baxıb təsdiqləyəcəksiniz.
      </p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-3xl bg-surface" />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  await requireAdmin();
  const [companies, categories] = await Promise.all([listCompanies(), listCategories()]);
  return (
    <NewProductForm companies={companies} categories={categories.map((c) => ({ id: c.id, name: c.name.az }))} />
  );
}
