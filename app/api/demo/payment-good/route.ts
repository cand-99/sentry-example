/**
 * API Route: /api/demo/payment-good (POST)
 *
 * PRAKTIK BAIK — Payment API yang melindungi data finansial.
 * Contoh implementasi yang BENAR untuk menangani payment:
 *
 *   ✅ console.log hanya berisi orderId, TIDAK ada data kartu
 *   ✅ Sentry.setContext("payment") hanya berisi orderId dan currency
 *   ✅ Sentry.setUser() menggunakan hash, bukan data asli
 *   ✅ captureException extra hanya berisi orderId
 *   ✅ Semua data kartu kredit, CVV, dan rekening bank TIDAK dikirim ke Sentry
 *
 * Bandingkan dengan versi buruk: app/api/demo/payment-bad/route.ts
 */
import * as Sentry from "@sentry/nextjs";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Simulasi data pembayaran
    const paymentData = {
      orderId: "ORD-2025-001",
      userId: "usr_12345",
      creditCardNumber: "4111111111111111",
      cvv: "123",
      expiryDate: "12/26",
      amount: 2500000,
      bankAccount: "9876543210",
    };

    // GOOD: JANGAN log data pembayaran apapun
    console.log("Processing payment for order:", paymentData.orderId);

    // GOOD: JANGAN set context finansial ke Sentry
    // Hanya set context non-sensitif
    Sentry.setContext("payment", {
      orderId: paymentData.orderId,
      // Hanya informasi yang aman
      currency: "IDR",
    });

    // GOOD: Hash user ID untuk korelasi
    const userHash = createHash("sha256")
      .update(paymentData.userId)
      .digest("hex")
      .substring(0, 8);

    Sentry.setUser({ id: userHash });

    throw new Error("Payment gateway timeout");

  } catch (error) {
    // GOOD: captureException TANPA data finansial
    Sentry.captureException(error, {
      extra: {
        orderId: "ORD-2025-001",
        // Tidak ada data kartu kredit, CVV, atau rekening bank
      },
      tags: {
        // GOOD: Gunakan hash, bukan data asli
        user_ref: "e5f7a8b2",
      },
    });

    return Response.json({ error: "Payment failed" }, { status: 500 });
  }
}
