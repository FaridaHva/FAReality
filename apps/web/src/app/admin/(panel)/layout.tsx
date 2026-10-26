import Image from "next/image";
import Link from "next/link";
import { logout } from "../actions";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold tracking-tight">
            <Image src="/logo.png" alt="" width={24} height={24} />
            FAReality
            <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] uppercase text-white">admin</span>
          </Link>
          <nav className="flex gap-5 text-sm text-muted">
            <Link href="/admin" className="hover:text-ink">
              Məhsullar
            </Link>
            <Link href="/admin/new" className="hover:text-ink">
              Yeni məhsul
            </Link>
            <a href="/az" target="_blank" rel="noopener" className="hover:text-ink">
              Sayt ↗
            </a>
          </nav>
          <form action={logout} className="ml-auto">
            <button className="text-sm text-muted hover:text-ink">Çıxış</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
