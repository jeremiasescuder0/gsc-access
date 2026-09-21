import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// web/ importa código de core/ (un nivel arriba, fuera de web/) con imports estáticos relativos
// — core/gsc-fetch.js, core/ads-fetch.js, core/store/*.js, etc. Sin esto el bundler (tanto
// webpack como Turbopack) rechaza resolver cualquier ruta que salga de web/, y Vercel tampoco
// incluiría esos archivos en el bundle de cada función serverless.
const REPO_ROOT = path.resolve(__dirname, "..");

// Headers de seguridad — aplicados a todas las rutas. CSP pragmática (permite 'unsafe-inline'
// en script/style) en vez de nonce-based estricta: Next.js inyecta scripts/estilos inline para
// hidratación y esta app no tiene la infraestructura de nonces por request armada todavía. Es
// defensa en profundidad real igual (bloquea scripts de terceros, framing, MIME sniffing), pero
// queda anotado como posible endurecimiento futuro en vez de fingir que es nonce-based.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

if (process.env.NODE_ENV === "production") {
  // Sólo en producción (asume HTTPS — Vercel termina TLS). No degradar local dev a HTTPS-only.
  SECURITY_HEADERS.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["google-ads-api", "googleapis"],
  devIndicators: false,
  outputFileTracingRoot: REPO_ROOT,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
