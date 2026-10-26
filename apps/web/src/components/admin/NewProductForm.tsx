"use client";

import { useActionState, useState } from "react";
import { createProduct } from "@/app/admin/actions";
import { Field, FormError, inputClass, SubmitButton } from "./forms";

const SOURCES = [
  ["artist", "3D dizayner (Blender və s.)"],
  ["cad", "Şirkətin CAD faylı"],
  ["scan", "Skan (telefon, fotogrammetriya)"],
  ["ai", "AI generator"],
  ["library", "Hazır kitabxana"],
] as const;

export function NewProductForm({
  companies,
  categories,
}: {
  companies: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createProduct, undefined);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "new");

  const section = "grid gap-4 rounded-3xl border border-line bg-surface p-6";
  return (
    <form action={action} className="mt-8 grid gap-6">
      <section className={section}>
        <h2 className="font-semibold">3D model</h2>
        <Field label="Model faylı (.glb)" hint="Blender: FAReality → GLB export və ya File → Export → glTF Binary">
          <input name="model" type="file" accept=".glb" required className={inputClass} />
        </Field>
        <Field label="Mənbə">
          <select name="source" defaultValue="artist" className={inputClass}>
            {SOURCES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Real ölçülər (sm)</h2>
        <p className="-mt-2 text-sm text-muted">Model bu ölçülərə uyğunlaşdırılır, saytda və AR-da bu ölçülər görünür.</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="En">
            <input name="width" type="number" min={1} required className={inputClass} />
          </Field>
          <Field label="Dərinlik">
            <input name="depth" type="number" min={1} required className={inputClass} />
          </Field>
          <Field label="Hündürlük">
            <input name="height" type="number" min={1} required className={inputClass} />
          </Field>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Şirkət və kateqoriya</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Şirkət">
            <select name="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="new">+ Yeni şirkət</option>
            </select>
          </Field>
          <Field label="Kateqoriya">
            <select name="categoryId" className={inputClass}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {companyId === "new" && (
          <div className="grid gap-4 rounded-2xl bg-bg p-4 sm:grid-cols-2">
            <Field label="Şirkətin adı">
              <input name="companyName" required className={inputClass} />
            </Field>
            <Field label="Şəhər">
              <input name="companyCity" placeholder="Bakı" className={inputClass} />
            </Field>
            <Field label="WhatsApp" hint="Beynəlxalq formatda: 994501234567">
              <input name="companyWhatsapp" inputMode="tel" className={inputClass} />
            </Field>
            <Field label="Telefon">
              <input name="companyPhone" inputMode="tel" placeholder="+994 12 345 67 89" className={inputClass} />
            </Field>
          </div>
        )}
      </section>

      <section className={section}>
        <h2 className="font-semibold">Məhsul</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ad (az)">
            <input name="name_az" required className={inputClass} />
          </Field>
          <Field label="Ad (ru)">
            <input name="name_ru" className={inputClass} />
          </Field>
          <Field label="Ad (en)">
            <input name="name_en" className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Təsvir (az)">
            <textarea name="description_az" rows={3} className={inputClass} />
          </Field>
          <Field label="Təsvir (ru)">
            <textarea name="description_ru" rows={3} className={inputClass} />
          </Field>
          <Field label="Təsvir (en)">
            <textarea name="description_en" rows={3} className={inputClass} />
          </Field>
        </div>
        <div className="sm:w-1/3">
          <Field label="Qiymət (AZN)" hint="Boş qalsa: «Qiymət sorğu ilə»">
            <input name="price" type="number" min={0} step="0.01" className={inputClass} />
          </Field>
        </div>
      </section>

      <FormError error={state?.error} />
      <div>
        <SubmitButton pendingText="Yüklənir və emal olunur…">Yüklə və yoxla</SubmitButton>
      </div>
    </form>
  );
}
