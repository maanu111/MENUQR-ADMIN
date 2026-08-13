import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { PayInvoice } from "@/components/app/PayInvoice";
import { requirePage } from "@/lib/auth/guards";
import { getPaymentSettings } from "@/lib/payment-settings";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";
import { featureLabel } from "@/lib/feature-labels";

export const dynamic = "force-dynamic";

const STATUS_NOTE: Record<string, string> = {
  TRIALING: "Free trial — nothing charged yet",
  ACTIVE: "Renews automatically",
  PAST_DUE: "Payment failed — service pauses soon",
  CANCELLED: "Cancelled",
};

const INVOICE_TONE: Record<string, string> = {
  PAID: "text-good",
  SUBMITTED: "text-brand",
  REJECTED: "text-bad",
  DUE: "text-warn",
  VOID: "text-ink-3",
};

const INVOICE_LABEL: Record<string, string> = {
  PAID: "paid",
  SUBMITTED: "checking your screenshot",
  REJECTED: "sent back",
  DUE: "due",
  VOID: "void",
};

function day(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BillingPage() {
  const { session } = await requirePage("billing");

  const [subscription, settings] = await Promise.all([
    db.subscription.findUnique({
      where: { restaurantId: session.restaurantId },
      include: {
        plan: true,
        invoices: { orderBy: { issuedAt: "desc" }, take: 24 },
      },
    }),
    getPaymentSettings(),
  ]);

  if (!subscription) {
    return (
      <>
        <PageHeader title="Billing" />
        <div className="px-5 py-6 sm:px-8">
          <Empty
            title="No subscription on file"
            body="This restaurant isn't attached to a plan yet. The platform team can attach one from their console."
          />
        </div>
      </>
    );
  }

  const features = Array.isArray(subscription.plan.features)
    ? (subscription.plan.features as string[])
    : [];
  const payable = subscription.invoices.filter(
    (i) => i.status === "DUE" || i.status === "REJECTED",
  );
  const outstanding = payable.reduce((sum, i) => sum + i.amountPaise, 0);
  const awaiting = subscription.invoices.filter((i) => i.status === "SUBMITTED");

  return (
    <>
      <PageHeader
        title="Billing"
        lede={STATUS_NOTE[subscription.status] ?? subscription.status}
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <StatGrid>
          <StatTile label="Plan" value={subscription.plan.name} foot="current tier" />
          <StatTile
            label="Price"
            value={
              subscription.plan.pricePaise === 0
                ? "Custom"
                : rupees(subscription.plan.pricePaise)
            }
            foot="per month"
          />
          <StatTile
            label={subscription.status === "TRIALING" ? "Trial ends" : "Renews"}
            value={day(
              subscription.status === "TRIALING"
                ? subscription.trialEndsAt
                : subscription.renewsAt,
            )}
          />
          <StatTile
            label="Outstanding"
            value={rupees(outstanding)}
            foot={outstanding > 0 ? "pay to stay live" : "all settled"}
            tone={outstanding > 0 ? "warn" : "good"}
          />
        </StatGrid>

        {/* ------------------------------------------------ Pay what's due */}
        {payable.length > 0 ? (
          <section>
            <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink">
              Due now
            </h2>
            <div className="flex flex-col gap-3">
              {payable.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-xl border border-line bg-ground p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="num text-[0.875rem] font-semibold text-ink">
                        {rupees(invoice.amountPaise)}
                      </p>
                      <p className="num text-[0.6875rem] text-ink-3">
                        {invoice.number} · issued {day(invoice.issuedAt)}
                      </p>
                      {invoice.rejectedReason ? (
                        <p className="mt-1 text-[0.6875rem] text-bad">
                          Sent back: {invoice.rejectedReason}
                        </p>
                      ) : null}
                    </div>
                    <PayInvoice
                      invoice={{
                        id: invoice.id,
                        number: invoice.number,
                        amountPaise: invoice.amountPaise,
                        rejectedReason: invoice.rejectedReason,
                      }}
                      upiId={settings.upiId}
                      payeeName={settings.payeeName}
                      qrUrl={settings.qrUrl}
                      note={settings.note}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {awaiting.length > 0 ? (
          <p className="rounded-xl border border-brand/30 bg-brand-wash px-4 py-3 text-[0.8125rem] text-ink">
            <b className="num">{awaiting.length}</b> payment
            {awaiting.length === 1 ? "" : "s"} submitted. We&rsquo;re checking the
            screenshot — your account stays live meanwhile.
          </p>
        ) : null}

        <section>
          <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink">
            What this plan includes
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <li
                key={f}
                className="rounded-full border border-line px-2.5 py-1 text-[0.6875rem] text-ink-2"
              >
                {featureLabel(f)}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.75rem] text-ink-3">
            Up to {subscription.plan.maxOutlets} outlets and{" "}
            {subscription.plan.maxTables} tables.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink">Invoices</h2>
          {subscription.invoices.length === 0 ? (
            <Empty
              title="No invoices yet"
              body="The first is raised when the trial ends."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-ground">
              <table className="w-full min-w-[30rem] text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["Invoice", "Issued", "Amount", "Reference", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {subscription.invoices.map((invoice) => (
                    <tr key={invoice.id} className="transition hover:bg-surface-2">
                      <td className="num px-4 py-3 text-[0.8125rem] text-ink">
                        {invoice.number}
                      </td>
                      <td className="num px-4 py-3 text-[0.8125rem] text-ink-2">
                        {day(invoice.issuedAt)}
                      </td>
                      <td className="num px-4 py-3 text-[0.8125rem] text-ink">
                        {rupees(invoice.amountPaise)}
                      </td>
                      <td className="num px-4 py-3 text-[0.75rem] text-ink-3">
                        {invoice.paymentRef ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-[0.75rem] font-medium ${
                          INVOICE_TONE[invoice.status] ?? "text-ink-3"
                        }`}
                      >
                        {INVOICE_LABEL[invoice.status] ?? invoice.status.toLowerCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
