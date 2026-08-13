import { PageHeader } from "@/components/app/Shell";
import { BrandingForm } from "@/components/app/BrandingForm";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { guestUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const { session } = await requirePage("branding");

  const restaurant = await db.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      brandColor: true,
      menuTheme: true,
      menuNote: true,
      tagline: true,
      tables: {
        where: { isActive: true },
        orderBy: { number: "asc" },
        take: 1,
        select: { qrToken: true },
      },
    },
  });

  const token = restaurant.tables[0]?.qrToken;

  return (
    <>
      <PageHeader
        title="Menu design"
        lede="Your logo and colour, on the page your guests actually see."
      />

      <div className="px-5 py-6 sm:px-8">
        <BrandingForm
          restaurantName={restaurant.name}
          previewHref={token ? guestUrl(restaurant.slug, token) : "#"}
          initial={{
            logoUrl: restaurant.logoUrl,
            brandColor: restaurant.brandColor,
            menuTheme: restaurant.menuTheme,
            menuNote: restaurant.menuNote ?? "",
            tagline: restaurant.tagline ?? "",
          }}
        />
      </div>
    </>
  );
}
