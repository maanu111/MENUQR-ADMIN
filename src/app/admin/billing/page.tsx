import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { InvoiceReview, type ReviewRow } from "@/components/app/InvoiceReview";
import { FilterBar } from "@/components/app/FilterBar";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const [invoices, activeRows, dueAgg, paidAgg, submitted] = await Promise.all([
    db.invoice.findMany({
      where: {
        ...(params.status
          ? { status: params.status as "DUE" }
          : {}),
        ...(query
          ? {
              OR: [
                { number: { contains: query } },
                { subscription: { restaurant: { name: { contains: query } } } },
              ],
            }
          : {}),
      },
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        subscription: {
          include: {
            restaurant: { select: { id: true, name: true } },
            plan: { select: { name: true } },
          },
        },
      },
    }),
    db.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: { select: { pricePaise: true } } },
    }),
    db.invoice.aggregate({ where: { status: "DUE" }, _sum: { amountPaise: true } }),
    db.invoice.aggregate({ where: { status: "PAID" }, _sum: { amountPaise: true } }),
    db.invoice.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        subscription: { include: { restaurant: { select: { name: true } } } },
      },
    }),
  ]);

  const review: ReviewRow[] = submitted.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    restaurantName: invoice.subscription.restaurant.name,
    amountPaise: invoice.amountPaise,
    proofUrl: invoice.proofUrl,
    paymentRef: invoice.paymentRef,
    payerNote: invoice.payerNote,
    submittedAt: invoice.submittedAt?.toISOString() ?? null,
  }));

  const mrr = activeRows.reduce((sum, row) => sum + row.plan.pricePaise, 0);

  return (
    <>
      <PageHeader title="Billing" lede="What the platform is owed, and by whom." />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <StatGrid>
          <StatTile
            label="Monthly income"
            value={rupees(mrr)}
            foot="from paying restaurants"
          />
          <StatTile
            label="Outstanding"
            value={rupees(dueAgg._sum.amountPaise ?? 0)}
            foot="not paid yet"
            tone={(dueAgg._sum.amountPaise ?? 0) > 0 ? "warn" : "good"}
          />
          <StatTile
            label="Collected"
            value={rupees(paidAgg._sum.amountPaise ?? 0)}
            foot="all time"
          />
          <StatTile
            label="To verify"
            value={String(review.length)}
            foot={review.length > 0 ? "screenshots to check" : "nothing waiting"}
            tone={review.length > 0 ? "warn" : "good"}
          />
        </StatGrid>

        <InvoiceReview rows={review} />

        <FilterBar
          showRange={false}
          searchPlaceholder="Invoice number or restaurant"
          selects={[
            {
              name: "status",
              label: "Status",
              options: [
                { value: "DUE", label: "Due" },
                { value: "SUBMITTED", label: "Awaiting check" },
                { value: "PAID", label: "Paid" },
                { value: "REJECTED", label: "Sent back" },
                { value: "VOID", label: "Void" },
              ],
            },
          ]}
        />

        {invoices.length === 0 ? (
          <Empty
            title="No invoices raised yet"
            body="The first is raised when a restaurant's trial ends and their plan starts charging."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-ground">
            <table className="w-full min-w-[38rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  {["Invoice", "Restaurant", "Plan", "Issued", "Amount", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="row cursor-pointer transition hover:bg-surface-2"
                  >
                    <td className="num px-4 py-3 text-[0.8125rem] text-ink">
                      {invoice.number}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/restaurants/${invoice.subscription.restaurant.id}`}
                        className="row-link text-[0.8125rem] text-ink hover:text-brand"
                      >
                        {invoice.subscription.restaurant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-2">
                      {invoice.subscription.plan.name}
                    </td>
                    <td className="num px-4 py-3 text-[0.75rem] text-ink-3">
                      {invoice.issuedAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="num px-4 py-3 text-[0.8125rem] text-ink">
                      {rupees(invoice.amountPaise)}
                    </td>
                    <td
                      className={`px-4 py-3 text-[0.75rem] font-medium ${
                        invoice.status === "PAID"
                          ? "text-good"
                          : invoice.status === "SUBMITTED"
                            ? "text-brand"
                            : invoice.status === "REJECTED"
                              ? "text-bad"
                              : invoice.status === "DUE"
                                ? "text-warn"
                                : "text-ink-3"
                      }`}
                    >
                      {invoice.status.toLowerCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
