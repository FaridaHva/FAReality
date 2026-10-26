import { getFile } from "@/lib/storage";

const TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  usdz: "model/vnd.usdz+zip",
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
};

/** Serves public uploads. Keys are unique per version, so they cache forever. */
export async function GET(_request: Request, { params }: RouteContext<"/files/[...key]">) {
  const key = (await params).key.join("/");
  const type = TYPES[key.split(".").pop()?.toLowerCase() ?? ""];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const body = await getFile("public", key);
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
