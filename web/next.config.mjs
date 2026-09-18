import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// web/ importa código de core/ (un nivel arriba, fuera de web/) con imports estáticos relativos
// — core/gsc-fetch.js, core/ads-fetch.js, core/store/*.js, etc. Sin esto el bundler (tanto
// webpack como Turbopack) rechaza resolver cualquier ruta que salga de web/, y Vercel tampoco
// incluiría esos archivos en el bundle de cada función serverless.
const REPO_ROOT = path.resolve(__dirname, "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["google-ads-api", "googleapis"],
  devIndicators: false,
  outputFileTracingRoot: REPO_ROOT,
};

export default nextConfig;
