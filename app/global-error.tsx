/**
 * app/global-error.tsx — Global Error Boundary
 *
 * Komponen ini menangkap semua error yang tidak tertangani di aplikasi.
 * Ini adalah error boundary terakhir (catch-all) di Next.js App Router.
 *
 * Cara kerja:
 *   1. Error tertangkap oleh React error boundary
 *   2. useEffect mengirim error ke Sentry via captureException
 *   3. Menampilkan halaman error default Next.js
 *
 * Catatan: Komponen ini HARUS menggunakan "use client" dan merender <html> & <body>
 * karena global-error menggantikan seluruh layout saat error terjadi.
 */
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
