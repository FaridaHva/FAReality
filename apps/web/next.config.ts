import type { NextConfig } from "next";

/** Raw 3D uploads (scans especially) can be large. */
const UPLOAD_LIMIT = "100mb";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@fareality/db", "@fareality/asset-pipeline"],
  // The pipeline's native and WebAssembly dependencies load from node_modules as-is.
  serverExternalPackages: [
    "sharp",
    "draco3dgltf",
    "gltf-validator",
    "meshoptimizer",
    "@gltf-transform/core",
    "@gltf-transform/extensions",
    "@gltf-transform/functions",
  ],
  experimental: {
    serverActions: { bodySizeLimit: UPLOAD_LIMIT },
    // Proxy buffers request bodies; without this, uploads over 10MB arrive truncated.
    proxyClientMaxBodySize: UPLOAD_LIMIT,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
