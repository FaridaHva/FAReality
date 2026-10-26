const LABELS: Record<string, [string, string]> = {
  draft: ["Qaralama", "bg-line text-ink"],
  published: ["Yayımda", "bg-green-100 text-green-800"],
  archived: ["Arxivdə", "bg-line text-muted"],
  processing: ["Emal olunur", "bg-accent-soft text-accent"],
  needs_review: ["Yoxlama gözləyir", "bg-amber-100 text-amber-800"],
  ready: ["Model hazır", "bg-green-100 text-green-800"],
  failed: ["Xəta", "bg-red-100 text-red-700"],
};

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = LABELS[status] ?? [status, "bg-line text-ink"];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}
