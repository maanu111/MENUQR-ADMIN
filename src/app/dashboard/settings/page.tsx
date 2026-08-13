import { PageHeader } from "@/components/app/Shell";
import { RestaurantForm } from "@/components/app/RestaurantForm";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The host guests' menus sit under, shown so the URL isn't abstract. */
function guestHost() {
  const explicit = process.env.NEXT_PUBLIC_GUEST_HOST;
  if (explicit) return explicit;
  try {
    return new URL(process.env.NEXT_PUBLIC_GUEST_URL ?? "https://tablet.app").host;
  } catch {
    return "tablet.app";
  }
}

export default async function RestaurantSettingsPage() {
  const { session } = await requirePage("settings");

  const restaurant = await db.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: {
      name: true,
      slug: true,
      fssai: true,
      gstPercent: true,
      serviceHours: true,
      isOpen: true,
      acceptsDelivery: true,
      deliveryNote: true,
      deliveryMinPaise: true,
      _count: { select: { tables: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Restaurant"
        lede="Your name, web address and the details that print on every bill."
      />

      <div className="px-5 py-6 sm:px-8">
        <RestaurantForm
          guestHost={guestHost()}
          hasPrintedCodes={restaurant._count.tables > 0}
          initial={{
            name: restaurant.name,
            slug: restaurant.slug,
            fssai: restaurant.fssai ?? "",
            gstPercent: String(restaurant.gstPercent),
            serviceHours: restaurant.serviceHours ?? "",
            isOpen: restaurant.isOpen,
            acceptsDelivery: restaurant.acceptsDelivery,
            deliveryNote: restaurant.deliveryNote ?? "",
            deliveryMin: String(restaurant.deliveryMinPaise / 100),
          }}
        />
      </div>
    </>
  );
}
