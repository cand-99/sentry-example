/**
 * API Route: /api/demo/user-bad (GET)
 *
 * PRAKTIK BURUK — User Profile API yang membocorkan PII ke Sentry.
 * File ini menunjukkan bagaimana data user bisa bocor melalui beberapa jalur:
 *
 *   ❌ console.log seluruh objek user (termasuk creditCard) → breadcrumb
 *   ❌ Sentry.setUser() dengan email, nama, dan IP address
 *   ❌ Sentry.setContext("user_financial") berisi creditCard & bankAccount
 *   ❌ Sentry.setTag() menggunakan email dan phone asli
 *
 * Lihat versi yang benar di: app/api/demo/user-good/route.ts
 */
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Simulasi data user dari database
    const user = {
      id: "usr_12345",
      name: "John Doe",
      email: "john.doe@rollingglory.com",
      phone: "+6281234567890",
      address: "Jl. Sudirman No. 1, Jakarta",
      dateOfBirth: "1990-05-15",
      creditCard: "4111111111111111",
      kartukredit: "4111 1111 1111 1111",
      bankAccount: "1234567890",
    };

    // BAD: Log seluruh objek user ke console - breadcrumb akan menangkap
    console.log("Fetched user data:", user);

    // BAD: Set seluruh data user ke Sentry scope
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // BAD: Simpan data finansial sebagai extra context
    Sentry.setContext("user_financial", {
      creditCard: user.creditCard,
      bankAccount: user.bankAccount,
      balance: 15000000,
    });

    // BAD: Simpan data PII sebagai tags
    Sentry.setTag("user_email", user.email);
    Sentry.setTag("user_phone", user.phone);

    // Simulasi error
    throw new Error("Failed to process user profile update");
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
