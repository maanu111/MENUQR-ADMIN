import "server-only";
import { db } from "./db";

/** One row, id "platform" — where every subscription payment is sent. */
export async function getPaymentSettings() {
  return db.paymentSettings.upsert({
    where: { id: "platform" },
    update: {},
    create: { id: "platform" },
  });
}

/** Nothing can be paid until the platform has published a QR to pay into. */
export function canAcceptPayments(settings: {
  qrUrl: string | null;
  upiId: string;
}) {
  return Boolean(settings.qrUrl && settings.upiId.trim());
}
