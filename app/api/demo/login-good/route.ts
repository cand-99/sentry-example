/**
 * API Route: /api/demo/login-good (POST)
 *
 * PRAKTIK BAIK — Login API yang melindungi data sensitif.
 * Ini adalah contoh implementasi yang BENAR:
 *
 *   ✅ Tidak ada console.log data sensitif
 *   ✅ Sentry.setUser() hanya berisi hashed ID, tanpa PII
 *   ✅ Tag menggunakan hash email, bukan email asli
 *   ✅ captureException extra hanya berisi info non-sensitif (action)
 *
 * Bandingkan dengan versi buruk: app/api/demo/login-bad/route.ts
 */
import * as Sentry from "@sentry/nextjs";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // GOOD: JANGAN console.log data sensitif
    // Hanya log informasi non-sensitif
    console.log("Login attempt for user_ref:", body.email ? "provided" : "missing");

    // GOOD: Set user context hanya dengan internal ID, tanpa PII
    const userRef = createHash("sha256")
      .update(body.email || "anonymous")
      .digest("hex")
      .substring(0, 8);

    Sentry.setUser({
      id: userRef,
    });

    // GOOD: Gunakan tag yang di-hash, bukan data asli
    Sentry.setTag("user_ref", userRef);

    throw new Error("Database connection failed during login");

  } catch (error) {
    // GOOD: captureException TANPA data sensitif di extra
    Sentry.captureException(error, {
      extra: {
        action: "login",
        // Tidak menyertakan password, token, atau data PII
      },
      tags: {
        // GOOD: Tag menggunakan hash, bukan data asli
        user_ref: "a1b2c3d4",
      },
    });

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
