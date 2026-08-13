import { PageHeader } from "@/components/app/Shell";
import { PaymentSettingsForm } from "@/components/app/PaymentSettingsForm";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { getPaymentSettings } from "@/lib/payment-settings";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PaymentSetupPage() {
  await requireSuperAdmin();

  const [settings, awaiting] = await Promise.all([
    getPaymentSettings(),
    db.invoice.count({ where: { status: "SUBMITTED" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Payment setup"
        lede="Where restaurants pay their subscription."
      />

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-8">
        {awaiting > 0 ? (
          <p className="rounded-xl border border-brand/30 bg-brand-wash px-4 py-3 text-[0.8125rem] text-ink">
            <b className="num">{awaiting}</b> payment
            {awaiting === 1 ? "" : "s"} waiting to be verified on the Billing page.
          </p>
        ) : null}

        <PaymentSettingsForm
          initial={{
            upiId: settings.upiId,
            payeeName: settings.payeeName,
            qrUrl: settings.qrUrl,
            note: settings.note,
          }}
        />
      </div>
    </>
  );
}
