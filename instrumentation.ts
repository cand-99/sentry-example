/**
 * instrumentation.ts — Entry point Sentry untuk Next.js
 *
 * File ini dijalankan oleh Next.js secara otomatis saat server/client pertama kali di-load.
 * Ia bertugas memuat konfigurasi Sentry yang sesuai berdasarkan runtime yang aktif:
 *   - Node.js runtime → memuat sentry.server.config.ts (untuk API routes, SSR, dll)
 *   - Edge runtime   → memuat sentry.edge.config.ts (untuk middleware, edge functions)
 *   - Client (browser) → tidak perlu dimuat di sini, sudah ditangani oleh instrumentation-client.ts
 *
 * `onRequestError` menangkap error yang terjadi di setiap request secara otomatis.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
