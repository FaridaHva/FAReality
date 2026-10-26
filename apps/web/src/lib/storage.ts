/**
 * File storage for uploads. Local disk for now; the same two functions can sit
 * on Cloudflare R2 / S3 later without callers changing.
 *
 * Public files (processed models, posters) are served by app/files/[...key];
 * private files (original uploads) never are.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Resolved at runtime; the comment keeps the build from tracing the whole project into the server bundle.
const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_DIR ?? "../../.data/storage");
const dirs = { public: path.join(root, "public"), private: path.join(root, "private") };

export type Visibility = keyof typeof dirs;

/** Absolute path for a key, refusing anything that would escape the storage folder. */
export function storagePath(visibility: Visibility, key: string): string {
  const base = dirs[visibility];
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new Error(`Invalid storage key: ${key}`);
  return full;
}

/** Public URL for a public key. */
export const fileUrl = (key: string) => `/files/${key}`;

/** Inverse of fileUrl, or null for URLs that aren't ours. */
export const keyFromUrl = (url: string) => (url.startsWith("/files/") ? url.slice("/files/".length) : null);

export async function putFile(visibility: Visibility, key: string, data: Uint8Array): Promise<string> {
  const full = storagePath(visibility, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return full;
}

export function getFile(visibility: Visibility, key: string): Promise<Buffer> {
  return readFile(storagePath(visibility, key));
}
