import { PageHeader } from "@/components/app/Shell";
import { BannerBoard, type BannerRow } from "@/components/app/BannerBoard";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const { session } = await requirePage("banners");

  const [banners, restaurant] = await Promise.all([
    db.banner.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        imageUrl: true,
        headline: true,
        subtext: true,
        code: true,
        isActive: true,
      },
    }),
    db.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { brandColor: true },
    }),
  ]);

  const live = banners.filter((b) => b.isActive).length;

  return (
    <>
      <PageHeader
        title="Banners"
        lede={
          banners.length === 0
            ? "Put an offer, a new dish or a festival at the top of your menu."
            : `${live} showing to guests · ${banners.length} in total`
        }
      />

      <div className="px-5 py-6 sm:px-8">
        <BannerBoard
          banners={banners as BannerRow[]}
          brandColor={restaurant?.brandColor ?? "#0284C7"}
        />
      </div>
    </>
  );
}
