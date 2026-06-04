/**
 * sentry.edge.config.ts — Konfigurasi Sentry di sisi Edge Runtime
 *
 * File ini di-load oleh instrumentation.ts saat Next.js berjalan di Edge runtime.
 * Edge runtime digunakan oleh middleware dan edge functions.
 *
 * Konfigurasi scrubbing mirip dengan server config, tapi dengan scope yang disesuaikan
 * untuk edge runtime yang memiliki keterbatasan API dibanding Node.js runtime.
 *
 * Scrubbing dilakukan pada area berikut:
 *   - event.user            → Hapus email, username, ip_address
 *   - event.request.headers → Hapus Cookie, Authorization, API keys
 *   - event.extra           → Replace field sensitif dengan "[Filtered]"
 *   - event.contexts        → Scrub user_financial dan payment contexts
 *   - event.tags            → Hapus user_email dan user_phone
 *   - event.server_name     → Hapus IP address server
 *   - event.breadcrumbs     → Filter console.log yang mengandung password
 *
 * Filter toggle: NEXT_PUBLIC_SENTRY_ENABLE_FILTERS (default: true)
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
  // Data yang dihapus di sini TIDAK PERNAH sampai ke server Sentry.
  beforeSend(event) {
    const enableFilters = process.env.NEXT_PUBLIC_SENTRY_ENABLE_FILTERS !== "false";

    // --- Area 1: Scrub user context (email, username, IP) ---
    if (enableFilters && event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    // --- Area 2: Scrub request headers yang sensitif ---
    if (enableFilters && event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
      delete event.request.headers["X-Api-Key"];
      delete event.request.headers["X-Access-Token"];
    }

    // --- Area 3: Hapus query string yang mungkin mengandung token ---
    // Contoh: /api/reset?token=abc123 → token akan ikut terkirim jika tidak dihapus
    if (enableFilters && event.request?.query_string) {
      delete event.request.query_string;
    }

    // --- Area 4: Scrub extra data — ganti nilai sensitif dengan "[Filtered]" ---
    if (event.extra) {
      const sensitiveKeys = [
        "password",
        "token",
        "secret",
        "apiKey",
        "creditCard",
        "ssn",
        "accessToken",
        "refreshToken",
      ];
      if (enableFilters) {
        for (const key of sensitiveKeys) {
          if (key in event.extra) {
            event.extra[key] = "[Filtered]";
          }
        }
      }
    }

    // --- Area 5: Scrub contexts — hapus data finansial dan PII dari Sentry contexts ---
    if (enableFilters && event.contexts) {
      if (event.contexts.user_financial) {
        delete event.contexts.user_financial.creditCard;
        delete event.contexts.user_financial.bankAccount;
      }

      if (event.contexts.payment) {
        if (typeof event.contexts.payment === "object" && event.contexts.payment !== null) {
          delete event.contexts.payment.creditCardNumber;
          delete event.contexts.payment.cvv;
          delete event.contexts.payment.bankAccount;
        }
      }

      if (event.contexts.user) {
        delete event.contexts.user.email;
        delete event.contexts.user.username;
        delete event.contexts.user.ip_address;
      }
    }

    // --- Area 6: Scrub tags — hapus tag yang berisi PII ---
    if (enableFilters && event.tags) {
      delete event.tags.user_email;
      delete event.tags.user_phone;
    }

    // --- Area 7: Hapus server_name (IP address) ---
    if (enableFilters) {
      delete event.server_name;
    }

    // --- Area 8: Filter breadcrumbs yang mengandung data sensitif ---
    if (event.breadcrumbs && enableFilters) {
      event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
        // Blokir console.log yang mengandung kata "password"
        if (
          breadcrumb.category === "console" &&
          breadcrumb.message?.toLowerCase().includes("password")
        ) {
          return false;
        }
        // Blokir breadcrumb dari endpoint autentikasi (mengandung credentials)
        if (
          breadcrumb.data?.url &&
          (breadcrumb.data.url.includes("/api/auth") ||
            breadcrumb.data.url.includes("/api/login"))
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

    // Blokir breadcrumb dari endpoint autentikasi
    if (enableFilters && breadcrumb.data?.url?.includes("/api/auth")) {
      return null;
    }

    // Filter console.log yang mengandung kata kunci sensitif
    if (enableFilters && breadcrumb.category === "console") {
      const sensitiveKeywords = [
        "password",
        "token",
        "secret",
        "api_key",
        "apikey",
        "credit_card",
        "ssn",
      ];
      const msg = breadcrumb.message?.toLowerCase() || "";
      if (sensitiveKeywords.some((kw) => msg.includes(kw))) {
        return null; // Breadcrumb diblokir, tidak akan tersimpan
      }
    }

    return breadcrumb;
  },
});
