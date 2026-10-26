import { ScanLine } from "lucide-react";

/** Isometric box with dimension lines — the "true to size" idea as a drawing. */
export function IsoBox({ width, depth, height }: { width: string; depth: string; height: string }) {
  const tick = "stroke-accent-light";
  return (
    <svg viewBox="50 10 280 220" className="h-auto w-full max-w-sm" aria-hidden>
      <g className="stroke-white/40" strokeWidth="1.25" strokeLinejoin="round">
        <polygon points="150,136 288.6,56 236.6,26 98,106" className="fill-white/[0.14]" />
        <polygon points="150,200 288.6,120 288.6,56 150,136" className="fill-white/[0.07]" />
        <polygon points="150,200 98,170 98,106 150,136" className="fill-white/[0.03]" />
      </g>
      <g className={tick} strokeWidth="1" strokeDasharray="3 3">
        <line x1="162.1" y1="207" x2="300.7" y2="127" />
        <line x1="137.9" y1="207" x2="85.9" y2="177" />
        <line x1="84" y1="170" x2="84" y2="106" />
      </g>
      <g className={tick} strokeWidth="1.25">
        <line x1="156" y1="203.5" x2="168.2" y2="210.5" />
        <line x1="294.7" y1="123.5" x2="306.8" y2="130.5" />
        <line x1="144" y1="203.5" x2="131.8" y2="210.5" />
        <line x1="92" y1="173.5" x2="79.8" y2="180.5" />
        <line x1="78" y1="170" x2="90" y2="170" />
        <line x1="78" y1="106" x2="90" y2="106" />
      </g>
      <g className="fill-accent-light font-mono" fontSize="10">
        <text x="246" y="181" textAnchor="middle" transform="rotate(-30 246 181)">
          {width}
        </text>
        <text x="100" y="205" textAnchor="middle" transform="rotate(30 100 205)">
          {depth}
        </text>
        <text x="70" y="138" textAnchor="middle" transform="rotate(-90 70 138)">
          {height}
        </text>
      </g>
    </svg>
  );
}

/** A showroom price tag with a working QR code to the product page. */
export function ShowroomTag({ name, price, qrSvg, caption }: { name: string; price: string; qrSvg: string; caption: string }) {
  return (
    <div className="w-52 rotate-[-4deg] rounded-2xl bg-white p-4 text-ink shadow-2xl shadow-black/40">
      <p className="truncate text-sm font-semibold">{name}</p>
      <p className="font-mono text-xs text-muted">{price}</p>
      <div className="mt-3 aspect-square w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-accent">
        <ScanLine className="size-3.5" strokeWidth={2} />
        {caption}
      </p>
    </div>
  );
}
