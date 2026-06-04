/**
 * API Route: /api/sentry-example-api (GET)
 *
 * Endpoint test bawaan Sentry SDK. Digunakan oleh halaman /sentry-example-page
 * untuk memverifikasi bahwa Sentry bisa menangkap error dari server-side.
 *
 * Endpoint ini SELALU throw error — itu memang tujuannya untuk testing.
 * Error yang dihasilkan akan muncul di Sentry Issues Dashboard.
 */
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

export function GET() {
  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
}
