import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { CategoryHeader } from "@/components/app/CategoryHeader";
import { MenuRow, type MenuRowData } from "@/components/app/MenuRow";
import { NewItemForm } from "@/components/app/NewItemForm";
import { FilterBar } from "@/components/app/FilterBar";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session } = await requirePage("menu");
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const categories = await db.category.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: {
          ...(query
            ? {
                OR: [
                  { name: { contains: query } },
                  { code: { contains: query } },
                ],
              }
            : {}),
          ...(params.diet ? { diet: params.diet as "VEG" | "NONVEG" | "EGG" } : {}),
          ...(params.available === "yes" ? { isAvailable: true } : {}),
          ...(params.available === "no" ? { isAvailable: false } : {}),
          ...(params.tag === "bestseller" ? { isBestseller: true } : {}),
          ...(params.tag === "addon" ? { isAddOn: true } : {}),
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          categoryId: true,
          code: true,
          name: true,
          description: true,
          pricePaise: true,
          costPaise: true,
          diet: true,
          isAvailable: true,
          prepMinutes: true,
          spiceLevel: true,
          imageUrl: true,
          isBestseller: true,
          isAddOn: true,
        },
      },
    },
  });

  /* With a filter on, hiding empty sections keeps the result readable. With
     no filter, an empty section must still show — otherwise a section you
     just created disappears and looks like it failed to save. */
  const filtering = Boolean(
    params.q || params.diet || params.available || params.tag,
  );
  const visible = filtering
    ? categories.filter((c) => c.items.length > 0)
    : categories;

  const total = categories.reduce((n, c) => n + c.items.length, 0);
  const soldOut = categories.reduce(
    (n, c) => n + c.items.filter((i) => !i.isAvailable).length,
    0,
  );

  return (
    <>
      <PageHeader
        title="Menu"
        lede={
          total === 0
            ? "Build the menu guests will see when they scan."
            : `${total} dishes · ${soldOut} marked sold out`
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <NewItemForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />

        <FilterBar
          showRange={false}
          searchPlaceholder="Dish name or kitchen code"
          selects={[
            {
              name: "diet",
              label: "Diet",
              options: [
                { value: "VEG", label: "Vegetarian" },
                { value: "NONVEG", label: "Non-vegetarian" },
                { value: "EGG", label: "Contains egg" },
              ],
            },
            {
              name: "available",
              label: "Availability",
              options: [
                { value: "yes", label: "On the menu" },
                { value: "no", label: "Sold out" },
              ],
            },
            {
              name: "tag",
              label: "Tag",
              options: [
                { value: "bestseller", label: "Bestsellers" },
                { value: "addon", label: "Add-ons" },
              ],
            },
          ]}
        />

        {visible.length === 0 ? (
          <Empty
            title={
              filtering ? "No dishes match those filters" : "Nothing on the menu yet"
            }
            body={
              filtering
                ? "Try clearing a filter, or search by a different name or code."
                : "Add a section, then the dishes that go in it. Guests see changes the moment you save."
            }
          />
        ) : (
          visible.map((category) => (
              <section key={category.id}>
                <CategoryHeader
                  id={category.id}
                  name={category.name}
                  count={category.items.length}
                />

                {category.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-ground px-4 py-5 text-center text-[0.75rem] text-ink-3">
                    Nothing in {category.name} yet — add a dish above and pick
                    this section.
                  </p>
                ) : (
                <div className="overflow-x-auto rounded-xl border border-line bg-ground">
                  <table className="w-full min-w-[38rem] text-left">
                    <thead>
                      <tr className="border-b border-line">
                        {["Dish", "Code", "Price", "Margin", "Prep", "On menu"].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3 ${
                                i === 5 ? "text-right" : ""
                              }`}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {category.items.map((item) => (
                        <MenuRow
                          key={item.id}
                          item={item as MenuRowData}
                          categories={categories.map((c) => ({
                            id: c.id,
                            name: c.name,
                          }))}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </section>
            ))
        )}
      </div>
    </>
  );
}
