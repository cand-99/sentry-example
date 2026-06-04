/**
 * API Route: /api/demo/payment-bad (POST)
 *
 * PRAKTIK BURUK — Payment API yang membocorkan data finansial ke Sentry.
 * Ini adalah contoh kesalahan KRITIS yang bisa menyebabkan kebocoran:
 *
 *   ❌ console.log seluruh paymentData (termasuk creditCardNumber, cvv)
 *   ❌ Sentry.setContext("payment") berisi creditCardNumber, cvv, bankAccount
 *   ❌ captureException extra berisi creditCardNumber dan cvv
 *   ❌ Tag menggunakan email asli
 *
 * Data finansial TIDAK BOLEH pernah terkirim ke Sentry.
 * Lihat versi yang benar di: app/api/demo/payment-good/route.ts
 */
import * as Sentry from "@sentry/nextjs";

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

    // BAD: Log seluruh data pembayaran termasuk kartu kredit
    console.log("Processing payment:", paymentData);

    // BAD: Simpan data finansial ke Sentry context
    Sentry.setContext("payment", {
      creditCardNumber: paymentData.creditCardNumber,
      cvv: paymentData.cvv,
      expiryDate: paymentData.expiryDate,
      bankAccount: paymentData.bankAccount,
    });

    // BAD: capture exception dengan data finansial
    throw new Error("Payment gateway timeout");

  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        // BAD: Data kartu kredit dan finansial di extra
        creditCardNumber: "4111111111111111",
        cvv: "123",
        amount: 2500000,
      },
      tags: {
        // BAD: User identifier asli di tags
        user_email: "john@example.com",
      },
    });

    return Response.json({ error: "Payment failed" }, { status: 500 });
  }
}
