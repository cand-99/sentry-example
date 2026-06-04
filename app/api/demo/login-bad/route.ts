/**
 * API Route: /api/demo/login-bad (POST)
 *
 * PRAKTIK BURUK — Login API yang membocorkan data sensitif ke Sentry.
 * File ini sengaja menunjukkan kesalahan umum yang HARUS DIHINDARI:
 *
 *   ❌ console.log email & password → tertangkap breadcrumb Sentry
 *   ❌ Sentry.setUser() dengan email, username, IP address (PII)
 *   ❌ captureException extra berisi password, accessToken, refreshToken
 *   ❌ Tag menggunakan email asli (PII)
 *
 * Lihat versi yang benar di: app/api/demo/login-good/route.ts
 */
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // BAD: console.log data sensitif - breadcrumb Sentry akan menangkapnya
    console.log("Login attempt:", {
      email: body.email,
      password: body.password,
    });

    // BAD: Set user context dengan data PII mentah
    Sentry.setUser({
      id: "usr_12345",
      email: body.email,
      username: body.email,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // BAD: captureException dengan data sensitif di extra
    // Simulasi error saat proses autentikasi
    throw new Error("Database connection failed during login");

  } catch (error) {
    // BAD: Mengirim error dengan data sensitif sebagai extra context
    Sentry.captureException(error, {
      extra: {
        email: "john@example.com",
        password: "super-secret-password-123",
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refreshToken: "rt_abc123def456",
      },
      tags: {
        // BAD: Tag dengan data PII mentah
        user_email: "john@example.com",
      },
    });

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
