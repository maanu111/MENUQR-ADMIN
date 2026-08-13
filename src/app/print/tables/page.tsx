import Link from "next/link";
import { requireRestaurant } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { qrSvg, restaurantUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

/**
 * Deliberately outside the console chrome: this page exists to come out of a
 * printer.
 *
 * A restaurant has exactly one code. It goes on the door, the counter, each
 * table, and the noticeboard in the office down the road — the same picture
 * every time, so there is nothing to keep straight and nothing to reprint when
 * a table is renumbered. The guest says where they are when the menu opens.
 */
export default async function PrintSheetPage() {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const restaurant = await db.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: { slug: true, name: true, acceptsDelivery: true },
  });

  const url = restaurantUrl(restaurant.slug);
  const svg = await qrSvg(url);

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="display text-xl">
              Your code — {restaurant.name}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-ink-2">
              One code for everything. Print it as many times as you like and
              put it wherever people order from.
            </p>
          </div>
          <Link
            href="/dashboard/tables"
            className="rounded-lg border border-line px-4 py-2 text-[0.8125rem] font-semibold text-ink"
          >
            Back
          </Link>
        </div>

        {/* Two sizes on one sheet: a large one for a poster or the counter,
            and four small ones to cut out and stand on tables. */}
        <div className="mx-auto max-w-md break-inside-avoid">
          <Card name={restaurant.name} svg={svg} size="large" delivery={restaurant.acceptsDelivery} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 print:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card
              key={i}
              name={restaurant.name}
              svg={svg}
              size="small"
              delivery={restaurant.acceptsDelivery}
            />
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[0.625rem] break-all text-neutral-400 print:mt-4">
          {url}
        </p>
      </div>
    </div>
  );
}

function Card({
  name,
  svg,
  size,
  delivery,
}: {
  name: string;
  svg: string;
  size: "large" | "small";
  delivery: boolean;
}) {
  return (
    <div className="flex break-inside-avoid flex-col items-center rounded-xl border border-neutral-300 p-6 text-center">
      <p className="text-[0.625rem] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
        {name}
      </p>
      <p
        className={`mt-1 font-semibold text-neutral-900 ${
          size === "large" ? "text-3xl" : "text-xl"
        }`}
      >
        Scan to order
      </p>

      <div
        className={`mt-4 text-neutral-900 [&_svg]:size-full ${
          size === "large" ? "w-56" : "w-36"
        }`}
        role="img"
        aria-label={`QR code for ${name}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <p className="mt-4 text-[0.75rem] leading-relaxed text-neutral-600">
        {delivery
          ? "See the menu, then tell us your table — or have it delivered"
          : "See the menu and tell us which table you're at"}
      </p>
    </div>
  );
}
