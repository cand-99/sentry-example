/**
 * API Route: /api/demo/user-good (GET)
 *
 * PRAKTIK BAIK — User Profile API yang melindungi data sensitif.
 * Contoh implementasi yang BENAR untuk menangani data user:
 *
 *   ✅ console.log hanya berisi internal ID, bukan objek user
 *   ✅ Sentry.setUser() hanya berisi ID internal
 *   ✅ Tag menggunakan hash email (8 karakter) untuk korelasi
 *   ✅ Data finansial TIDAK dikirim ke Sentry sama sekali
 *   ✅ captureException extra hanya berisi action dan userId
 *
 * Bandingkan dengan versi buruk: app/api/demo/user-bad/route.ts
 */
import * as Sentry from "@sentry/nextjs";
import { createHash } from "crypto";

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
      bankAccount: "1234567890",
    };

    // GOOD: JANGAN log data user - hanya log status operasi
    console.log("User profile fetched for internal_id:", user.id);

    // GOOD: Hanya set internal ID, tanpa email/nama/IP
    Sentry.setUser({
      id: user.id,
    });

    // GOOD: Hash email untuk korelasi internal tanpa membocorkan data asli
    const emailHash = createHash("sha256")
      .update(user.email)
      .digest("hex")
      .substring(0, 8);

    Sentry.setTag("user_ref", emailHash);

    // GOOD: JANGAN set context finansial ke Sentry
    // Data finansial tetap di internal log/sistem, bukan di Sentry

    throw new Error("Failed to process user profile update");

  } catch (error) {
    // GOOD: captureException tanpa data sensitif
    Sentry.captureException(error, {
      extra: {
        action: "profile_update",
        userId: "usr_12345",
      },
    });

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
