/**
 * instrumentation-client.ts — Konfigurasi Sentry di sisi Client (Browser)
 *
 * File ini di-load otomatis oleh Next.js di browser pengguna.
 * Semua error yang terjadi di sisi client akan melewati konfigurasi ini sebelum dikirim ke Sentry.
 *
 * Fitur yang dikonfigurasi di sini:
 *   1. sendDefaultPii: false       → Jangan kirim PII (IP, user agent) secara otomatis
 *   2. denyUrls                     → Blokir error dari third-party scripts (GA, GTM, extensions)
 *   3. beforeSend                   → Scrub data sensitif sebelum event dikirim ke Sentry
 *   4. beforeBreadcrumb             → Filter breadcrumb yang mengandung data sensitif
 *
 * Toggle filter: atur NEXT_PUBLIC_SENTRY_ENABLE_FILTERS di .env.local
 *   - true  (default) = filter aktif, data sensitif di-scrub
 *   - false           = filter mati, HANYA untuk demo/development
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1,

  enableLogs: true,

  // WAJIB: Jangan kirim PII secara otomatis di production
  sendDefaultPii: false,

  // Blokir error dari third-party scripts yang bukan milik tim
  denyUrls: [
    // Abaikan error dari Google Analytics & GTM
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /analytics\.google\.com/i,
    // Abaikan error dari CDN eksternal
    /cdn\.example\.com/i,
    /cloudflare\.com/i,
    /cloudflareinsights\.com/i,
    // Abaikan error dari browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^edge:\/\//i,
    /^firefox:\/\//i,
    // Abaikan error dari ad-blockers
    /adblock/i,
    /ublock/i,
  ],

  // beforeSend: Filter terakhir sebelum event dikirim ke server Sentry.
  // Semua modifikasi di sini memastikan data sensitif TIDAK PERNAH keluar dari browser.
  beforeSend(event) {
    const enableFilters = process.env.NEXT_PUBLIC_SENTRY_ENABLE_FILTERS !== "false";

    // --- Area 1: Scrub user context (email, username, IP) ---
    if (enableFilters && event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }

    // --- Area 2: Scrub request headers yang sensitif ---
    if (enableFilters && event.request?.headers) {
      delete event.request.headers["Cookie"];
      delete event.request.headers["cookie"];
      delete event.request.headers["Authorization"];
      delete event.request.headers["authorization"];
    }

    // --- Area 3: Scrub extra data — ganti nilai sensitif dengan "[Filtered]" ---
    // Daftar field yang otomatis di-mask jika ada di event.extra
    if (event.extra) {
      const sensitiveKeys = [
        "password",
        "apiToken",
        "creditCard",
        "bankAccount",
        "balance",
        "kartukredit",       // Bahasa Indonesia
        "sessionToken",
        "accessToken",
        "refreshToken",
        "creditCardNumber",
        "cvv",
        "email",
      ];
      if (enableFilters) {
        for (const key of sensitiveKeys) {
          if (key in event.extra) {
            event.extra[key] = "[Filtered]";
          }
        }
      }
    }

    // --- Area 4: Scrub contexts — hapus data finansial dari Sentry contexts ---
    if (enableFilters && event.contexts) {
      // Hapus creditCard & bankAccount dari context "user_financial"
      if (event.contexts.user_financial) {
        delete event.contexts.user_financial.creditCard;
        delete event.contexts.user_financial.bankAccount;
      }

      // Hapus creditCardNumber, cvv, bankAccount dari context "payment"
      if (event.contexts.payment) {
        if (typeof event.contexts.payment === "object" && event.contexts.payment !== null) {
          delete event.contexts.payment.creditCardNumber;
          delete event.contexts.payment.cvv;
          delete event.contexts.payment.bankAccount;
        }
      }

      // Hapus PII dari context "user"
      if (event.contexts.user) {
        delete event.contexts.user.email;
        delete event.contexts.user.username;
        delete event.contexts.user.ip_address;
      }
    }

    // --- Area 5: Scrub tags — hapus tag yang berisi PII ---
    if (enableFilters && event.tags) {
      delete event.tags.user_email;
      delete event.tags.user_phone;
    }

    // --- Area 6: Hapus server_name (IP address) ---
    if (enableFilters) {
      delete event.server_name;
    }

    // --- Area 7: Filter breadcrumbs yang mengandung password ---
    if (event.breadcrumbs && enableFilters) {
      event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
        if (
          breadcrumb.category === "console" &&
          breadcrumb.message?.toLowerCase().includes("password")
        ) {
          return false;
        }
        return true;
      });
    }

    return event;
  },

  // beforeBreadcrumb: Dipanggil setiap kali Sentry akan menyimpan breadcrumb baru.
  // Return null = breadcrumb TIDAK disimpan. Return breadcrumb = disimpan.
  beforeBreadcrumb(breadcrumb) {
    const enableFilters = process.env.NEXT_PUBLIC_SENTRY_ENABLE_FILTERS !== "false";

    // Filter console.log yang mengandung kata kunci sensitif
    if (enableFilters && breadcrumb.category === "console") {
      const sensitiveKeywords = ["password", "pw", "token"];
      const msg = breadcrumb.message?.toLowerCase() || "";
      if (sensitiveKeywords.some((kw) => msg.includes(kw))) {
        return null; // Breadcrumb diblokir, tidak akan tersimpan
      }
    }

    return breadcrumb;
  },
});
