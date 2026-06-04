/**
 * app/page.tsx — Halaman utama (Home)
 *
 * Menampilkan navigasi ke dua fitur demo:
 *   1. Demo Perlindungan Data Sensitif (/demo) — Perbandingan bad vs good practice
 *   2. Sentry Example Original (/sentry-example-page) — Halaman bawaan Sentry SDK
 *
 * Juga menampilkan ringkasan konfigurasi Sentry yang sedang aktif.
 */
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Sentry Example - Next.js
          </h1>
          <p className="text-gray-400">
            Demo implementasi Sentry.io dengan perlindungan data sensitif
            sesuai guideline ISO 27001
          </p>
        </div>

        <div className="grid gap-4">
          {/* Main Demo */}
          <Link
            href="/demo"
            className="block rounded-xl border border-purple-800 bg-purple-950/30 p-6 hover:bg-purple-950/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-purple-300">
              Demo Perlindungan Data Sensitif
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Perbandingan praktik buruk vs baik: setUser, tags, breadcrumbs,
              captureException, dan API routes (login, user, payment).
            </p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300">
                Bad Practice
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300">
                Good Practice
              </span>
              <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300">
                beforeSend
              </span>
            </div>
          </Link>

          {/* Original Sentry Example */}
          <Link
            href="/sentry-example-page"
            className="block rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:bg-gray-800/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-200">
              Sentry Example (Original)
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Halaman demo bawaan Sentry untuk test error capture dan SDK
              connectivity.
            </p>
          </Link>
        </div>

        {/* Quick Config Summary */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Konfigurasi Aktif
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              sendDefaultPii: false
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              beforeSend: aktif
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              beforeBreadcrumb: aktif
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              denyUrls: aktif
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              DSN: env variable
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Server-side scrubbing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
