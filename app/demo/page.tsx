/**
 * app/demo/page.tsx — Halaman Demo Perlindungan Data Sensitif
 *
 * Halaman ini adalah inti dari demo project. Menampilkan 7 skenario perbandingan
 * antara praktik buruk (yang membocorkan data) dan praktik baik (yang aman).
 *
 * Setiap skenario menampilkan:
 *   - Kode praktik buruk (merah) dengan tombol "Kirim ke Sentry" untuk testing
 *   - Kode praktik baik (hijau) sebagai referensi yang benar
 *
 * Skenario yang tersedia:
 *   1. Sentry.setUser() — PII Leak
 *   2. Sentry.setTag() — Hashing untuk korelasi
 *   3. console.log — Password di breadcrumb
 *   4. captureException extra — Data sensitif
 *   5. Login API (server-side)
 *   6. User Profile API (server-side)
 *   7. Payment API (server-side)
 *
 * Fitur tambahan:
 *   - Status konfigurasi Sentry (beforeSend, beforeBreadcrumb, denyUrls, dll)
 *   - Toggle PII filters via NEXT_PUBLIC_SENTRY_ENABLE_FILTERS
 *   - Warning ketika filters non-aktif
 *   - Log hasil pengiriman error
 *
 * State management:
 *   - results[]  → menyimpan daftar skenario yang sudah dikirim ke Sentry
 *   - loading    → tracking skenario mana yang sedang berjalan
 *   - showConfigDetails → toggle tampilan detail konfigurasi
 */
"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import Link from "next/link";

const FILTERS_ENABLED = process.env.NEXT_PUBLIC_SENTRY_ENABLE_FILTERS !== "false";

type ConfigItem = {
  key: string;
  label: string;
  status: "active" | "inactive";
  location: string;
  description: string;
};

type DemoResult = {
  scenario: string;
  message: string;
};

export default function DemoPage() {
  const [results, setResults] = useState<DemoResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [showConfigDetails, setShowConfigDetails] = useState(false);

  const configs: ConfigItem[] = [
    {
      key: "sendDefaultPii",
      label: "sendDefaultPii",
      status: "inactive",
      location: "All Sentry configs",
      description: "Mencegah Sentry mengirim PII otomatis (IP, user agent)",
    },
    {
      key: "beforeSend",
      label: "beforeSend Filter",
      status: FILTERS_ENABLED ? "active" : "inactive",
      location: "sentry.*.config.ts, instrumentation-client.ts",
      description: "Filter email, IP, username, dan data sensitif sebelum dikirim",
    },
    {
      key: "beforeBreadcrumb",
      label: "beforeBreadcrumb Filter",
      status: FILTERS_ENABLED ? "active" : "inactive",
      location: "sentry.*.config.ts, instrumentation-client.ts",
      description: "Filter console.log dan request URL yang mengandung sensitif",
    },
    {
      key: "denyUrls",
      label: "denyUrls",
      status: "active",
      location: "All Sentry configs",
      description: "Blokir error dari third-party (GTM, GA, extensions, CDN)",
    },
  ];

  const addResult = (scenario: string) => {
    setResults((prev) => [...prev, { scenario }]);
  };

  const clearResults = () => setResults([]);

  // ===== Scenario Functions =====
  // Setiap fungsi di bawah mensimulasikan pengiriman data sensitif ke Sentry.
  // Jika NEXT_PUBLIC_SENTRY_ENABLE_FILTERS=true, beforeSend akan scrub data sebelum terkirim.

  // Skenario 1: setUser dengan PII mentah (email, username, IP)
  const runSetUserBad = () => {
    setLoading("user");
    Sentry.setUser({
      id: "usr_12345",
      email: "john.doe@rollingglory.com",
      username: "John Doe",
      ip_address: "192.168.1.100",
    });
    Sentry.captureException(new Error("Demo: setUser dengan PII"));
    Sentry.setUser(null);
    addResult("setUser dengan PII");
    setLoading(null);
  };

  // Skenario 2: Tag menggunakan data PII asli (harusnya di-hash)
  const runTagBad = () => {
    setLoading("tag");
    Sentry.setTag("user_email", "john.doe@rollingglory.com");
    Sentry.setTag("user_phone", "+6281234567890");
    Sentry.captureException(new Error("Demo: Tags dengan PII"));
    addResult("Tags dengan PII");
    setLoading(null);
  };

  // Skenario 3: console.log dengan password — tertangkap oleh breadcrumb Sentry
  const runBreadcrumbBad = () => {
    setLoading("breadcrumb");
    console.log("User login data:", {
      email: "john@example.com",
      password: "super-secret-123",
      pw: "super-secret-123",
    });
    Sentry.captureException(new Error("Demo: console.log dengan password"));
    addResult("Breadcrumb dengan password");
    setLoading(null);
  };

  // Skenario 4: captureException dengan data sensitif di extra context
  const runExtraBad = () => {
    setLoading("extra");
    Sentry.captureException(new Error("Demo: Extra dengan data sensitif"), {
      extra: {
        email: "john@example.com",
        password: "super-secret-123",
        apiToken: "sk_live_abc123def456",
        creditCard: "4111111111111111",
        kartukredit: "4111 1111 1111 1111",
        sessionToken: "sess_xyz789",
      },
    });
    addResult("Extra dengan data sensitif");
    setLoading(null);
  };

  // Skenario 5: Panggil API route /api/demo/login-bad (server-side error)
  const runLoginBad = async () => {
    setLoading("login-api");
    try {
      await fetch("/api/demo/login-bad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "john@example.com",
          password: "super-secret-123",
        }),
      });
    } catch {}
    addResult("Login API (server-side)");
    setLoading(null);
  };

  // Skenario 6: Panggil API route /api/demo/user-bad (server-side error)
  const runUserBad = async () => {
    setLoading("user-api");
    try {
      await fetch("/api/demo/user-bad");
    } catch {}
    addResult("User API (server-side)");
    setLoading(null);
  };

  // Skenario 7: Panggil API route /api/demo/payment-bad (server-side error)
  const runPaymentBad = async () => {
    setLoading("payment-api");
    try {
      await fetch("/api/demo/payment-bad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 2500000 }),
      });
    } catch {}
    addResult("Payment API (server-side)");
    setLoading(null);
  };

  const scenarios = [
    {
      id: "user",
      title: "1. Sentry.setUser() - PII Leak",
      description: "Data PII (email, username, IP) dikirim ke Sentry",
      badCode: `Sentry.setUser({
  id: "usr_12345",
  email: "john.doe@rollingglory.com",  // PII
  username: "John Doe",                 // PII
  ip_address: "192.168.1.100",         // PII
});`,
      goodCode: `// Yang benar: hanya internal ID
Sentry.setUser({
  id: "usr_12345",
});`,
      onRun: runSetUserBad,
    },
    {
      id: "tag",
      title: "2. Sentry.setTag() - Hashing untuk Korelasi",
      description: "Email dan nomor telepon dikirim sebagai tags. Gunakan hashing untuk korelasi tanpa PII.",
      badCode: `Sentry.setTag("user_email", "john@example.com");  // PII
Sentry.setTag("user_phone", "+6281234567890");    // PII`,
      goodCode: `// Yang benar: gunakan hash
import { createHash } from 'crypto';

const emailHash = createHash('sha256')
  .update("john@example.com")
  .digest('hex')
  .substring(0, 8);
Sentry.setTag("user_ref", emailHash);`,
      onRun: runTagBad,
    },
    {
      id: "breadcrumb",
      title: "3. console.log - Password di Breadcrumb",
      description: "Password terekam di console.log yang ditangkap Sentry",
      badCode: `// Breadcrumb Sentry menangkap ini!
console.log("User login:", {
  email: "john@example.com",
  password: "super-secret-123",
});`,
      goodCode: `// Yang benar: log tanpa sensitif
console.log("User login attempt for user_ref:", "a1b2c3d4");`,
      onRun: runBreadcrumbBad,
    },
    {
      id: "extra",
      title: "4. captureException extra - Data Sensitif",
      description: "Password, token, kartu kredit dikirim di extra context",
      badCode: `Sentry.captureException(error, {
  extra: {
    password: "super-secret-123",     // PII
    apiToken: "sk_live_abc123",        // PII
    creditCard: "4111111111111111",    // PII
    kartukredit: "4111 1111 1111 1111", // PII
  },
});`,
      goodCode: `// Yang benar: hanya context aman
Sentry.captureException(error, {
  extra: {
    action: "payment_processing",
    orderId: "ORD-2025-001",
  },
});`,
      onRun: runExtraBad,
    },
    {
      id: "login-api",
      title: "5. Login API Route (Server-side)",
      description: "Server mengirim password & token ke Sentry",
      badCode: `// Server-side: BAD
console.log("Login:", { email, password });
Sentry.setUser({ email, username, ip_address });
Sentry.captureException(error, {
  extra: { password, accessToken, refreshToken },
});`,
      goodCode: `// Server-side: GOOD
console.log("Login attempt for user_ref:", userHash);
Sentry.setUser({ id: userHash });
Sentry.captureException(error, {
  extra: { action: "login" },
});`,
      onRun: runLoginBad,
    },
    {
      id: "user-api",
      title: "6. User Profile API Route (Server-side)",
      description: "Server mengirim PII dan data finansial",
      badCode: `// Server-side: BAD
console.log("User data:", user);
Sentry.setUser({ email, username, ip });
Sentry.setContext("user_financial", { accountNumber });`,
      goodCode: `// Server-side: GOOD
console.log("User fetched:", user.id);
Sentry.setUser({ id: user.id });
// Jangan kirim data finansial ke Sentry`,
      onRun: runUserBad,
    },
    {
      id: "payment-api",
      title: "7. Payment API Route (Server-side)",
      description: "Server mengirim nomor kartu kredit dan CVV",
      badCode: `// Server-side: BAD
console.log("Payment:", paymentData);
Sentry.setContext("payment", {
  creditCardNumber, cvv, bankAccount
});`,
      goodCode: `// Server-side: GOOD
console.log("Payment for order:", orderId);
Sentry.setContext("payment", { orderId });
// Jangan kirim data kartu ke Sentry`,
      onRun: runPaymentBad,
    },
  ];

  const currentDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-white">
            Sentry Data Sensitif - Demo
          </h1>
          <p className="mt-2 text-gray-400">
            Demo pengiriman data sensitif ke Sentry. Klik tombol pada praktik buruk untuk mengirim error ke Sentry.
            {FILTERS_ENABLED ? (
              <span className="text-green-400"> Filter aktif - data akan di-scrub.</span>
            ) : (
              <span className="text-red-400"> Filter non-aktif - data akan terkirim.</span>
            )}
          </p>
          <div className="mt-3 flex gap-4 text-sm">
            <a
              href="https://rgb-fe.sentry.io/issues/?project=4511493509152768"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Buka Sentry Dashboard →
            </a>
            <Link href="/" className="text-gray-500 hover:text-gray-300">
              ← Kembali ke Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Warning */}
        {!FILTERS_ENABLED && (
          <section className="mb-6 rounded-lg border border-red-800 bg-red-950/30 p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-xl">!</span>
              <div className="flex-1">
                <h3 className="text-red-300 font-semibold mb-1">Filters Disabled - Demo Mode</h3>
                <p className="text-sm text-red-200/80">
                  Data sensitif AKAN terkirim ke Sentry. Hanya untuk development/learning.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Config Status */}
        <section className="mb-10 rounded-lg border border-blue-800 bg-blue-950/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-300">Konfigurasi Sentry</h2>
            <button
              onClick={() => setShowConfigDetails(!showConfigDetails)}
              className="text-xs text-blue-400 hover:text-purple-300 underline"
            >
              {showConfigDetails ? "Sembunyikan detail" : "Lihat detail"}
            </button>
          </div>

          {/* DSN Info */}
          <div className="mb-4 p-3 rounded bg-blue-900/20 border border-blue-800/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">DSN:</span>
              <code className="text-xs bg-gray-800 px-2 py-1 rounded flex-1 truncate">
                {currentDsn.substring(0, 50)}...
              </code>
            </div>
          </div>

          {showConfigDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {configs.map((config) => (
                <div key={config.key} className="p-3 rounded bg-gray-900/50 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-200">{config.label}</span>
                    <span className={`h-2 w-2 rounded-full ${config.status === "active" ? "bg-green-400" : "bg-red-400"}`} />
                  </div>
                  <p className="text-xs text-gray-400">{config.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{config.location}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter Toggle */}
          <div className="mt-4 pt-4 border-t border-blue-800/50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">PII Filters:</span>
                <button
                  onClick={() =>
                    alert(`Ubah NEXT_PUBLIC_SENTRY_ENABLE_FILTERS di .env.local:\n\n${FILTERS_ENABLED ? "false" : "true"} → ${FILTERS_ENABLED ? "true" : "false"}\n\nLalu restart dev server.`)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    FILTERS_ENABLED ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      FILTERS_ENABLED ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className={`text-xs font-semibold ${FILTERS_ENABLED ? "text-green-400" : "text-red-400"}`}>
                  {FILTERS_ENABLED ? "AKTIF" : "NON-AKTIF"}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Toggle: <code className="px-1 py-0.5 bg-gray-800 rounded">./toggle-filters.sh [on|off]</code>
              </div>
            </div>
          </div>
        </section>

        {/* Scenarios */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Scenario Testing</h2>
          <p className="text-sm text-gray-400">
            Klik tombol pada praktik buruk untuk mengirim error ke Sentry dan melihat hasilnya di dashboard.
          </p>

          {scenarios.map((scenario) => (
            <section key={scenario.id} className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">{scenario.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{scenario.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                {/* Bad Practice - With Button */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="text-sm font-semibold text-red-400">Praktik Buruk</span>
                  </div>
                  <pre className="text-xs bg-red-950/50 border border-red-900/50 rounded-md p-3 overflow-x-auto mb-4 text-red-200/80 max-h-48">
                    <code>{scenario.badCode}</code>
                  </pre>
                  <button
                    onClick={scenario.onRun}
                    disabled={loading === scenario.id}
                    className="w-full px-4 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-700/50 text-red-200 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loading === scenario.id ? "Mengirim..." : "Kirim ke Sentry"}
                  </button>
                </div>

                {/* Good Practice - Reference Only */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="text-sm font-semibold text-green-400">Praktik Baik</span>
                  </div>
                  <pre className="text-xs bg-green-950/50 border border-green-900/50 rounded-md p-3 overflow-x-auto text-green-200/80 max-h-48">
                    <code>{scenario.goodCode}</code>
                  </pre>
                  <p className="text-xs text-gray-500 mt-3 text-center">Hanya referensi - tidak mengirim ke Sentry</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Terkirim ke Sentry</h2>
              <button
                onClick={clearResults}
                className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300"
              >
                Bersihkan
              </button>
            </div>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={i} className="rounded-lg border border-red-800 bg-red-950/30 p-3 flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm text-gray-300">{result.scenario}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {FILTERS_ENABLED
                ? "Data telah di-scrub oleh filter beforeSend. Cek dashboard untuk melihat [Filtered]."
                : "Data lengkap telah terkirim ke Sentry. Cek dashboard untuk verifikasi."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
