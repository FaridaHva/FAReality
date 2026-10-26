"use client";

import { Maximize2, Rotate3d, Ruler, ScanLine } from "lucide-react";
import { Fragment, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
    }
  }
}

type Vec3 = { x: number; y: number; z: number };
type Hotspot = { canvasPosition: Vec3; facingCamera: boolean } | null;

/** The slice of the <model-viewer> element API we use. */
interface ModelViewerElement extends HTMLElement {
  loaded: boolean;
  getDimensions(): Vec3;
  getBoundingBoxCenter(): Vec3;
  updateHotspot(config: { name: string; position?: string; normal?: string }): void;
  queryHotspot(name: string): Hotspot;
  /** theta: 0 looks at the front, negative swings the camera to the model's left. */
  getCameraOrbit(): { theta: number; phi: number; radius: number };
  /** How far auto-rotate has turned the model itself, in radians. */
  turntableRotation: number;
  cameraOrbit: string;
  jumpCameraToGoal(): void;
  toBlob(options: { mimeType: string; qualityArgument: number }): Promise<Blob>;
}

/** What a parent can do with the viewer through `ref`. */
export interface ModelViewerHandle {
  /** The standard catalog shot (front three-quarter, transparent background) as WebP. */
  capturePoster(): Promise<Blob>;
}

interface Props {
  src: string;
  alt: string;
  /** Pre-built iOS file; without it model-viewer converts the GLB on the device. */
  iosSrc?: string | null;
  poster?: string | null;
  /** Declared product size in cm, shown on the dimension lines. */
  size?: { width: number | null; depth: number | null; height: number | null };
  labels: { viewInRoom: string; dragHint: string; dimensions: string; fullscreen: string };
  /** hero: no zoom, so scrolling the page never gets stuck on the viewer. */
  variant?: "product" | "hero";
  className?: string;
  ref?: React.Ref<ModelViewerHandle>;
}

const noopSubscribe = () => () => {};

// Like a technical drawing: each dimension is a line set just outside the
// model on the sides nearest the camera — in front of the model, so drawing
// them over it is never wrong. Width and depth run along the floor; height
// rises from the corner where they would meet.
const EDGES = ["width", "height", "depth"] as const;
type Edge = (typeof EDGES)[number];
type Side = { x: number; z: number };

function visibleSide(mv: ModelViewerElement): Side {
  // Camera angle relative to the model: auto-rotate turns the model, not the camera.
  const theta = mv.getCameraOrbit().theta - mv.turntableRotation;
  return { x: Math.sin(theta) < 0 ? -1 : 1, z: Math.cos(theta) < 0 ? -1 : 1 };
}

function edgeGeometry(edge: Edge, c: Vec3, half: Vec3, side: Side) {
  const gap = Math.max(half.x, half.z) * 0.12;
  const floor = c.y - half.y;
  const nearX = c.x + side.x * (half.x + gap);
  const nearZ = c.z + side.z * (half.z + gap);
  const p = (x: number, y: number, z: number) => `${x} ${y} ${z}`;
  switch (edge) {
    case "width":
      return { a: p(c.x - half.x, floor, nearZ), b: p(c.x + half.x, floor, nearZ), label: p(c.x, floor, nearZ) };
    case "depth":
      return { a: p(nearX, floor, c.z - half.z), b: p(nearX, floor, c.z + half.z), label: p(nearX, floor, c.z) };
    case "height":
      return { a: p(nearX, floor, nearZ), b: p(nearX, c.y + half.y, nearZ), label: p(nearX, c.y, nearZ) };
  }
}

/**
 * 3D viewer + "view in your room". One component covers every phone:
 * Android opens Scene Viewer / WebXR, iPhone opens AR Quick Look.
 * On top it draws the product's real dimensions, tracking the model as it turns.
 */
export function ModelViewer({ src, alt, iosSrc, poster, size, labels, variant = "product", className, ref: handleRef }: Props) {
  const ref = useRef<ModelViewerElement>(null);

  useImperativeHandle(handleRef, () => ({
    async capturePoster() {
      const mv = ref.current;
      if (!mv?.loaded) throw new Error("Model hələ yüklənməyib");
      const previous = mv.cameraOrbit;
      // Tighter than the on-page framing, which leaves room for dimension lines.
      mv.cameraOrbit = "-30deg 72deg 105%";
      mv.jumpCameraToGoal();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const blob = await mv.toBlob({ mimeType: "image/webp", qualityArgument: 0.9 });
      mv.cameraOrbit = previous;
      mv.jumpCameraToGoal();
      // Let the dimension labels re-render at the restored camera before anything else happens.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return blob;
    },
  }));
  const linesRef = useRef<SVGSVGElement>(null);
  const [showDims, setShowDims] = useState(true);
  const [inAR, setInAR] = useState(false);
  // iPhone Safari can't fullscreen elements; the server never can.
  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );
  const [measured, setMeasured] = useState<Vec3 | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // The web component touches `window`, so load it only in the browser.
    import("@google/model-viewer");

    const mv = ref.current;
    if (!mv) return;

    let side: Side | null = null;
    let frame = 0;

    const drawLines = () => {
      linesRef.current?.querySelectorAll("g").forEach((group, i) => {
        const a = mv.queryHotspot(`hotspot-${EDGES[i]}-a`)?.canvasPosition;
        const b = mv.queryHotspot(`hotspot-${EDGES[i]}-b`)?.canvasPosition;
        if (!a || !b) return;
        const [casing, line, startCap, endCap] = group.children;
        for (const l of [casing, line]) {
          l.setAttribute("x1", String(a.x));
          l.setAttribute("y1", String(a.y));
          l.setAttribute("x2", String(b.x));
          l.setAttribute("y2", String(b.y));
        }
        startCap.setAttribute("cx", String(a.x));
        startCap.setAttribute("cy", String(a.y));
        endCap.setAttribute("cx", String(b.x));
        endCap.setAttribute("cy", String(b.y));
      });
    };

    const placeHotspots = (next: Side) => {
      side = next;
      const c = mv.getBoundingBoxCenter();
      const d = mv.getDimensions();
      const half = { x: d.x / 2, y: d.y / 2, z: d.z / 2 };
      for (const edge of EDGES) {
        const g = edgeGeometry(edge, c, half, side);
        mv.updateHotspot({ name: `hotspot-${edge}-a`, position: g.a });
        mv.updateHotspot({ name: `hotspot-${edge}-b`, position: g.b });
        mv.updateHotspot({ name: `hotspot-${edge}-label`, position: g.label });
      }
      setMeasured(d);
    };

    // Follow every rendered frame rather than camera-change events: auto-rotate
    // and the interaction prompt move the model without firing them.
    const tick = () => {
      if (mv.loaded) {
        const next = visibleSide(mv);
        // Swap the lines to the other side once the view swings past a corner.
        if (!side || next.x !== side.x || next.z !== side.z) placeHotspots(next);
        drawLines();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onAR = (e: Event) => setInAR((e as CustomEvent<{ status: string }>).detail.status === "session-started");
    const onProgress = (e: Event) => setProgress((e as CustomEvent<{ totalProgress: number }>).detail.totalProgress);
    mv.addEventListener("ar-status", onAR);
    mv.addEventListener("progress", onProgress);
    return () => {
      cancelAnimationFrame(frame);
      mv.removeEventListener("ar-status", onAR);
      mv.removeEventListener("progress", onProgress);
    };
  }, []);

  // Declared size wins; fall back to what the model measures.
  const cm = (declared: number | null | undefined, metres: number | undefined) =>
    declared ?? (metres !== undefined ? Math.round(metres * 100) : null);
  const text: Record<Edge, number | null> = {
    width: cm(size?.width, measured?.x),
    height: cm(size?.height, measured?.y),
    depth: cm(size?.depth, measured?.z),
  };
  const dimsVisible = showDims && !inAR && measured !== null;
  const hero = variant === "hero";

  return (
    <model-viewer
      ref={ref}
      class={className}
      src={src}
      ios-src={iosSrc ?? undefined}
      poster={poster ?? undefined}
      alt={alt}
      ar
      ar-modes="webxr scene-viewer quick-look"
      // Furniture must stay true to size: customers check whether it fits.
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls
      // Pulled back from the default 105% to leave room for the dimension lines;
      // the max must grow too or the camera is clamped back to 105%.
      camera-orbit="-35deg 72deg 135%"
      max-camera-orbit="auto auto 160%"
      touch-action="pan-y"
      interaction-prompt="auto"
      disable-zoom={hero ? true : undefined}
      shadow-intensity="1"
      shadow-softness="0.9"
      environment-image="neutral"
      tone-mapping="neutral"
    >
      {/* Hotspots must be direct children of <model-viewer> to be slotted. */}
      {EDGES.map((edge) => (
        <Fragment key={edge}>
          <div slot={`hotspot-${edge}-a`} className="dim-dot" data-position="0 0 0" />
          <div slot={`hotspot-${edge}-b`} className="dim-dot" data-position="0 0 0" />
          <div
            slot={`hotspot-${edge}-label`}
            className={`dim-label ${dimsVisible && text[edge] ? "" : "dim-hidden"}`}
            data-position="0 0 0"
          >
            {text[edge]} cm
          </div>
        </Fragment>
      ))}
      <svg
        ref={linesRef}
        className={`pointer-events-none absolute inset-0 h-full w-full ${dimsVisible ? "" : "dim-hidden"}`}
      >
        {EDGES.map((edge) => (
          <g key={edge}>
            {/* White casing keeps the line readable over dark materials. */}
            <line className="dim-casing" />
            <line className="dim-line" />
            <circle className="dim-cap" r="2.5" />
            <circle className="dim-cap" r="2.5" />
          </g>
        ))}
      </svg>

      {/* Replaces the built-in bar, whose fade-out we couldn't rely on. */}
      <div
        slot="progress-bar"
        className={`absolute inset-x-0 top-0 h-0.5 origin-left bg-accent transition-[transform,opacity] duration-300 ${
          progress >= 1 ? "opacity-0" : ""
        }`}
        style={{ transform: `scaleX(${progress})` }}
      />

      {!hero && (
        <div className="absolute left-4 top-4 hidden items-center gap-1.5 rounded-full bg-white/75 sm:flex px-3 py-1.5 font-mono text-[11px] text-ink/70 backdrop-blur">
          <Rotate3d className="size-3.5" strokeWidth={1.75} />
          {labels.dragHint}
        </div>
      )}

      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowDims((v) => !v)}
          aria-pressed={showDims}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
            showDims ? "bg-ink text-white" : "bg-white/75 text-ink hover:bg-white"
          }`}
        >
          <Ruler className="size-3.5" strokeWidth={1.75} />
          {labels.dimensions}
        </button>
        {!hero && canFullscreen && (
          <button
            type="button"
            onClick={() => ref.current?.requestFullscreen()}
            aria-label={labels.fullscreen}
            title={labels.fullscreen}
            className="grid size-8 place-items-center rounded-full bg-white/75 text-ink backdrop-blur transition hover:bg-white"
          >
            <Maximize2 className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* model-viewer only shows this on devices that can do AR. */}
      <button
        slot="ar-button"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-accent/30"
      >
        <ScanLine className="size-4" strokeWidth={2} />
        {labels.viewInRoom}
      </button>
    </model-viewer>
  );
}
