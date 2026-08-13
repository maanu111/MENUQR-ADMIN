import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  type OrderChannel,
  type OrderStage,
  type StaffRole,
} from "../src/generated/prisma";
import { PLAN_DEFAULTS } from "../src/lib/plans";

const db = new PrismaClient();

/* How much history to fabricate. Enough that every report has a shape. */
const DAYS_OF_HISTORY = 45;

const CATEGORIES = [
  "Starters",
  "Tandoor",
  "Main Course",
  "Breads",
  "Rice & Biryani",
  "Desserts",
  "Beverages",
];

type Dish = {
  category: string;
  code: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  diet: "VEG" | "NONVEG";
  prep: number;
  spice?: number;
  best?: boolean;
  addOn?: boolean;
  /** Relative likelihood of being ordered — drives best/worst seller reports. */
  weight: number;
};

const DISHES: Dish[] = [
  { category: "Starters", code: "ST01", name: "Paneer Tikka", description: "Charred cottage cheese, hung curd and ajwain.", price: 34000, cost: 12000, diet: "VEG", prep: 18, spice: 2, best: true, weight: 9 },
  { category: "Starters", code: "ST02", name: "Dahi Ke Kebab", description: "Crisp yoghurt kebabs. Delicate — eat hot.", price: 31000, cost: 10500, diet: "VEG", prep: 15, spice: 1, weight: 4 },
  { category: "Starters", code: "ST03", name: "Amritsari Macchi", description: "Sole in carom batter, fried crisp.", price: 48000, cost: 21000, diet: "NONVEG", prep: 20, spice: 2, weight: 3 },
  { category: "Starters", code: "ST04", name: "Chilli Mushroom", description: "Tossed with pepper, garlic and soy.", price: 29000, cost: 11000, diet: "VEG", prep: 14, spice: 3, weight: 1 },

  { category: "Tandoor", code: "TN01", name: "Murgh Malai Tikka", description: "Cream cheese and cardamom. Mild, smoky.", price: 46000, cost: 19000, diet: "NONVEG", prep: 22, spice: 1, best: true, weight: 8 },
  { category: "Tandoor", code: "TN02", name: "Tandoori Chicken", description: "Kashmiri chilli, mustard oil, on the bone.", price: 52000, cost: 22000, diet: "NONVEG", prep: 28, spice: 2, weight: 6 },
  { category: "Tandoor", code: "TN03", name: "Tandoori Broccoli", description: "Cheddar and mustard, blistered over charcoal.", price: 38000, cost: 14000, diet: "VEG", prep: 18, spice: 1, weight: 2 },
  { category: "Tandoor", code: "TN04", name: "Mutton Seekh Kebab", description: "Minced lamb, brown onion, garam masala.", price: 54000, cost: 24000, diet: "NONVEG", prep: 25, spice: 2, weight: 4 },

  { category: "Main Course", code: "MC01", name: "Dal Makhani", description: "Black urad simmered twenty-four hours.", price: 38000, cost: 9000, diet: "VEG", prep: 12, spice: 1, best: true, weight: 12 },
  { category: "Main Course", code: "MC02", name: "Butter Chicken", description: "Tomato and cashew gravy, finished with methi.", price: 52000, cost: 20000, diet: "NONVEG", prep: 18, spice: 1, best: true, weight: 14 },
  { category: "Main Course", code: "MC03", name: "Paneer Lababdar", description: "Twice-cooked onion-tomato masala.", price: 43000, cost: 15000, diet: "VEG", prep: 16, spice: 2, weight: 6 },
  { category: "Main Course", code: "MC04", name: "Laal Maas", description: "Mathania chillies and garlic. Genuinely hot.", price: 64000, cost: 27000, diet: "NONVEG", prep: 26, spice: 3, weight: 3 },

  { category: "Breads", code: "BR01", name: "Butter Naan", description: "Off the tandoor wall, brushed with butter.", price: 8000, cost: 2000, diet: "VEG", prep: 8, addOn: true, weight: 18 },
  { category: "Breads", code: "BR02", name: "Garlic Kulcha", description: "Stuffed with potato and coriander.", price: 11000, cost: 3000, diet: "VEG", prep: 12, best: true, addOn: true, weight: 13 },
  { category: "Breads", code: "BR03", name: "Laccha Paratha", description: "Hand-coiled, pulls apart in sheets.", price: 9500, cost: 2600, diet: "VEG", prep: 10, addOn: true, weight: 8 },
  { category: "Breads", code: "BR04", name: "Tandoori Roti", description: "Plain whole wheat, clay oven.", price: 5500, cost: 1400, diet: "VEG", prep: 7, addOn: true, weight: 10 },

  { category: "Rice & Biryani", code: "RB01", name: "Mutton Biryani", description: "Sealed and dum-cooked. Serves two.", price: 62000, cost: 26000, diet: "NONVEG", prep: 35, spice: 2, best: true, weight: 9 },
  { category: "Rice & Biryani", code: "RB02", name: "Subz Biryani", description: "Saffron milk and fried onion. Serves two.", price: 48000, cost: 17000, diet: "VEG", prep: 30, spice: 1, weight: 4 },
  { category: "Rice & Biryani", code: "RB03", name: "Jeera Rice", description: "Basmati tempered with cumin and ghee.", price: 22000, cost: 6000, diet: "VEG", prep: 12, addOn: true, weight: 2 },

  { category: "Desserts", code: "DS01", name: "Gulab Jamun", description: "Warm khoya dumplings. Two pieces.", price: 18000, cost: 5000, diet: "VEG", prep: 6, addOn: true, weight: 5 },
  { category: "Desserts", code: "DS02", name: "Shahi Tukda", description: "Saffron rabdi and pistachio.", price: 22000, cost: 7000, diet: "VEG", prep: 10, best: true, addOn: true, weight: 4 },
  { category: "Desserts", code: "DS03", name: "Kulfi Falooda", description: "Vermicelli, basil seed and rose.", price: 21000, cost: 6500, diet: "VEG", prep: 5, addOn: true, weight: 1 },

  { category: "Beverages", code: "BV01", name: "Sweet Lassi", description: "Thick set curd, topped with malai.", price: 15000, cost: 4000, diet: "VEG", prep: 5, best: true, addOn: true, weight: 11 },
  { category: "Beverages", code: "BV02", name: "Masala Chaas", description: "Buttermilk with cumin and curry leaf.", price: 12000, cost: 3000, diet: "VEG", prep: 4, addOn: true, weight: 7 },
  { category: "Beverages", code: "BV03", name: "Nimbu Soda", description: "Fresh lime, black salt and soda.", price: 11000, cost: 2500, diet: "VEG", prep: 3, addOn: true, weight: 6 },
  { category: "Beverages", code: "BV04", name: "Kesar Chai", description: "Saffron, green cardamom, full-fat milk.", price: 9000, cost: 2500, diet: "VEG", prep: 6, addOn: true, weight: 9 },
];

/* Orders per hour, as a share of the day. Two humps: lunch and dinner. */
const HOUR_WEIGHTS = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 6, 14, 18, 12, 5, 4, 6, 10, 16, 20, 15, 7, 2,
];

const CUSTOMER_NAMES = [
  "Aditi Sharma", "Rohan Mehta", "Fatima Sheikh", "Vikram Iyer", "Neha Kapoor",
  "Arjun Nair", "Sanya Gupta", "Imran Qureshi", "Kavya Reddy", "Devansh Joshi",
];

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function weightedPick(dishes: Dish[]) {
  const total = dishes.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * total;
  for (const dish of dishes) {
    roll -= dish.weight;
    if (roll <= 0) return dish;
  }
  return dishes[dishes.length - 1];
}

function weightedHour() {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let hour = 0; hour < 24; hour++) {
    roll -= HOUR_WEIGHTS[hour];
    if (roll <= 0) return hour;
  }
  return 20;
}

async function main() {
  const hash = await bcrypt.hash("password123", 12);

  // -------------------------------------------------------------- plans
  for (const tier of Object.keys(PLAN_DEFAULTS)) {
    const d = PLAN_DEFAULTS[tier];
    await db.plan.upsert({
      where: { tier },
      update: { name: d.name, pricePaise: d.pricePaise, maxOutlets: d.maxOutlets, maxTables: d.maxTables, features: d.features },
      create: { tier, name: d.name, pricePaise: d.pricePaise, maxOutlets: d.maxOutlets, maxTables: d.maxTables, features: d.features },
    });
  }
  const plans = {
    STARTER: await db.plan.findUniqueOrThrow({ where: { tier: "STARTER" } }),
    GROWTH: await db.plan.findUniqueOrThrow({ where: { tier: "GROWTH" } }),
    CHAIN: await db.plan.findUniqueOrThrow({ where: { tier: "CHAIN" } }),
  };
  console.log("✓ plans");

  // --------------------------------------------------------- super admin
  await db.user.upsert({
    where: { email: "admin@tablet.app" },
    update: {},
    create: {
      email: "admin@tablet.app",
      name: "Platform Admin",
      phone: "9000000001",
      passwordHash: hash,
      platformRole: "SUPER_ADMIN",
      lastLoginAt: new Date(),
    },
  });
  console.log("✓ super admin");

  // ------------------------------------- three tenants, three situations
  const tenants = [
    { slug: "kesar-tandoor", name: "Kesar Tandoor", tagline: "North Indian · Charcoal grill", plan: plans.GROWTH, status: "ACTIVE" as const, tables: 14, owner: ["owner@kesartandoor.in", "Rakesh Malhotra", "9812345670"] as const, full: true },
    { slug: "cafe-mango", name: "Cafe Mango", tagline: "All-day café", plan: plans.STARTER, status: "TRIALING" as const, tables: 8, owner: ["owner@cafemango.in", "Priya Menon", "9812345671"] as const, full: false },
    { slug: "spice-route", name: "Spice Route", tagline: "Coastal kitchen", plan: plans.GROWTH, status: "PAST_DUE" as const, tables: 10, owner: ["owner@spiceroute.in", "Ganesh Pillai", "9812345672"] as const, full: false },
  ];

  for (const tenant of tenants) {
    const restaurant = await db.restaurant.upsert({
      where: { slug: tenant.slug },
      update: {},
      create: {
        slug: tenant.slug,
        name: tenant.name,
        tagline: tenant.tagline,
        fssai: `115220040002${Math.floor(10 + Math.random() * 89)}`,
        gstPercent: 5,
        serviceHours: "12:00 pm – 11:30 pm",
        /* On for the demo so the delivery flow is visible without hunting
           for the switch. Each restaurant sets its own terms. */
        acceptsDelivery: true,
        deliveryNote: "Within 5 km. ₹30 delivery. Usually 35–45 minutes.",
        deliveryMinPaise: 30000,
        createdAt: new Date(Date.now() - (DAYS_OF_HISTORY + 10) * 86400000),
        subscription: {
          create: {
            planId: tenant.plan.id,
            status: tenant.status,
            trialEndsAt: tenant.status === "TRIALING" ? new Date(Date.now() + 9 * 86400000) : null,
            renewsAt: tenant.status === "TRIALING" ? null : new Date(Date.now() + 18 * 86400000),
          },
        },
      },
    });

    const [email, name, phone] = tenant.owner;
    const ownerUser = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, phone, passwordHash: hash, lastLoginAt: new Date(Date.now() - 86400000) },
    });
    await db.membership.upsert({
      where: { userId_restaurantId: { userId: ownerUser.id, restaurantId: restaurant.id } },
      update: {},
      create: { userId: ownerUser.id, restaurantId: restaurant.id, role: "OWNER", acceptedAt: new Date() },
    });

    for (let i = 1; i <= tenant.tables; i++) {
      await db.restaurantTable.upsert({
        where: { restaurantId_number: { restaurantId: restaurant.id, number: String(i) } },
        update: {},
        create: {
          restaurantId: restaurant.id,
          number: String(i),
          seats: i <= Math.ceil(tenant.tables / 2) ? 4 : 6,
          section: i <= Math.ceil(tenant.tables / 2) ? "Garden side" : "Indoor",
          qrToken: randomBytes(4).toString("hex").toUpperCase(),
        },
      });
    }

    if (!tenant.full) continue;
    await seedFullRestaurant(restaurant.id, hash);
  }

  console.log("✓ 3 restaurants");
  await seedInvoices();
  console.log("✓ invoices");
}

/** The demo restaurant gets staff, a full menu, stock, offers and history. */
async function seedFullRestaurant(restaurantId: string, hash: string) {
  const staff: [string, string, string, StaffRole][] = [
    ["manager@kesartandoor.in", "Sunita Rao", "9812345673", "MANAGER"],
    ["waiter@kesartandoor.in", "Imran Shaikh", "9812345674", "WAITER"],
    ["kitchen@kesartandoor.in", "Chef Devendra", "9812345675", "KITCHEN"],
  ];
  for (const [email, name, phone, role] of staff) {
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, phone, passwordHash: hash, lastLoginAt: new Date(Date.now() - Math.random() * 3 * 86400000) },
    });
    await db.membership.upsert({
      where: { userId_restaurantId: { userId: user.id, restaurantId } },
      update: {},
      create: { userId: user.id, restaurantId, role, acceptedAt: new Date() },
    });
  }

  const categoryIds = new Map<string, string>();
  for (const [index, name] of CATEGORIES.entries()) {
    const row = await db.category.upsert({
      where: { restaurantId_name: { restaurantId, name } },
      update: {},
      create: { restaurantId, name, sortOrder: index },
    });
    categoryIds.set(name, row.id);
  }

  const menuIds = new Map<string, string>();
  for (const [index, dish] of DISHES.entries()) {
    const row = await db.menuItem.upsert({
      where: { restaurantId_code: { restaurantId, code: dish.code } },
      update: {},
      create: {
        restaurantId,
        categoryId: categoryIds.get(dish.category)!,
        code: dish.code,
        name: dish.name,
        description: dish.description,
        pricePaise: dish.price,
        costPaise: dish.cost,
        diet: dish.diet,
        prepMinutes: dish.prep,
        spiceLevel: dish.spice ?? 0,
        isBestseller: dish.best ?? false,
        isAddOn: dish.addOn ?? false,
        isAvailable: dish.code !== "ST04",
        sortOrder: index,
      },
    });
    menuIds.set(dish.code, row.id);
  }

  /* One dish carries a spice choice so the guest options flow has something. */
  const tikka = menuIds.get("ST01")!;
  if ((await db.optionGroup.count({ where: { menuItemId: tikka } })) === 0) {
    await db.optionGroup.create({
      data: {
        menuItemId: tikka,
        name: "Spice level",
        isRequired: true,
        choices: {
          create: [
            { label: "Mild", priceDeltaPaise: 0, sortOrder: 0 },
            { label: "Medium", priceDeltaPaise: 0, sortOrder: 1 },
            { label: "Hot", priceDeltaPaise: 0, sortOrder: 2 },
          ],
        },
      },
    });
  }

  for (const [name, unit, qty, low] of [
    ["Paneer", "kg", 8, 5], ["Chicken", "kg", 22, 10], ["Mutton", "kg", 6, 8],
    ["Basmati rice", "kg", 40, 15], ["Butter", "kg", 12, 6], ["Tomatoes", "kg", 30, 12],
    ["Cream", "l", 9, 5], ["Curd", "kg", 18, 8],
  ] as [string, string, number, number][]) {
    await db.inventoryItem.upsert({
      where: { restaurantId_name: { restaurantId, name } },
      update: {},
      create: { restaurantId, name, unit, quantity: qty, lowAt: low },
    });
  }

  for (const [code, kind, value, minSpend] of [
    ["WEEKEND20", "PERCENT", 20, 150000], ["FIRST100", "FLAT", 10000, 50000],
  ] as [string, "PERCENT" | "FLAT", number, number][]) {
    await db.offer.upsert({
      where: { restaurantId_code: { restaurantId, code } },
      update: {},
      create: { restaurantId, code, kind, value, minSpendPaise: minSpend },
    });
  }

  /* Two slides, so the strip actually slides in the demo — one with words
     over a colour wash, one advertising a code that really exists. */
  if ((await db.banner.count({ where: { restaurantId } })) === 0) {
    await db.banner.createMany({
      data: [
        {
          restaurantId,
          headline: "20% off every weekend",
          subtext: "On orders over ₹1,500, Saturday and Sunday.",
          code: "WEEKEND20",
          sortOrder: 0,
        },
        {
          restaurantId,
          headline: "₹100 off your first order",
          subtext: "Spend ₹500 or more and the code does the rest.",
          code: "FIRST100",
          sortOrder: 1,
        },
      ],
    });
  }

  const existing = await db.order.count({ where: { restaurantId } });
  if (existing > 0) {
    console.log(`  · history already present (${existing} orders), skipping`);
    return;
  }

  await seedHistory(restaurantId, menuIds);
}

/** Bulk-inserted so 45 days of service seeds in seconds, not minutes. */
async function seedHistory(restaurantId: string, menuIds: Map<string, string>) {
  const tables = await db.restaurantTable.findMany({
    where: { restaurantId },
    select: { id: true },
  });

  const orders: Prisma.OrderCreateManyInput[] = [];
  const items: Prisma.OrderItemCreateManyInput[] = [];
  const scans: Prisma.QrScanCreateManyInput[] = [];
  const usedCodes = new Set<string>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let back = DAYS_OF_HISTORY; back >= 0; back--) {
    const day = new Date(today);
    day.setDate(day.getDate() - back);
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    /* Weekends run about 60% busier, and the last week trends up. */
    const trend = 1 + (DAYS_OF_HISTORY - back) / (DAYS_OF_HISTORY * 3);
    const count = Math.round((weekend ? 46 : 30) * trend * (0.85 + Math.random() * 0.3));

    for (let i = 0; i < count; i++) {
      const hour = weightedHour();
      const placedAt = new Date(day);
      placedAt.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
      if (placedAt > new Date()) continue;

      let code = "";
      do {
        code = `T-${Math.floor(1000 + Math.random() * 9000)}`;
      } while (usedCodes.has(code));
      usedCodes.add(code);

      const orderId = randomUUID();
      const guests = 1 + Math.floor(Math.random() * 4);
      const lineCount = 2 + Math.floor(Math.random() * 4);

      const chosen = new Map<string, { dish: Dish; qty: number }>();
      for (let n = 0; n < lineCount; n++) {
        const dish = weightedPick(DISHES);
        const entry = chosen.get(dish.code);
        if (entry) entry.qty += 1;
        else chosen.set(dish.code, { dish, qty: 1 + Math.floor(Math.random() * 2) });
      }

      let subtotal = 0;
      for (const { dish, qty } of chosen.values()) {
        subtotal += dish.price * qty;
        items.push({
          id: randomUUID(),
          orderId,
          menuItemId: menuIds.get(dish.code)!,
          nameSnapshot: dish.name,
          unitPricePaise: dish.price,
          costPaise: dish.cost,
          qty,
        });
      }

      const tax = Math.round(subtotal * 0.05);
      const isToday = back === 0;
      const cancelled = Math.random() < 0.03;

      /* Today keeps a few tickets mid-service so the kitchen queue is alive. */
      let stage: OrderStage = "SERVED";
      if (cancelled) stage = "CANCELLED";
      else if (isToday && Math.random() < 0.25) {
        stage = pick<OrderStage>(["PLACED", "ACCEPTED", "PREPARING", "READY"]);
      }

      const channel: OrderChannel = Math.random() < 0.72 ? "QR" : Math.random() < 0.7 ? "POS" : "PHONE";
      const withDetails = Math.random() < 0.35;

      orders.push({
        id: orderId,
        restaurantId,
        tableId: channel === "PHONE" ? null : pick(tables).id,
        sessionId: randomUUID(),
        code,
        channel,
        stage,
        paymentStatus: stage === "SERVED" ? "PAID" : "UNPAID",
        guests,
        customerName: withDetails ? pick(CUSTOMER_NAMES) : null,
        customerPhone: withDetails ? `9${Math.floor(100000000 + Math.random() * 899999999)}` : null,
        subtotalPaise: subtotal,
        taxPaise: tax,
        totalPaise: subtotal + tax,
        placedAt,
        readyAt: stage === "SERVED" ? new Date(placedAt.getTime() + 22 * 60000) : null,
        servedAt: stage === "SERVED" ? new Date(placedAt.getTime() + 28 * 60000) : null,
      });

      /* Not every scan becomes an order — people look, then decide. */
      if (channel === "QR") {
        const scanCount = 1 + (Math.random() < 0.4 ? 1 : 0);
        for (let s = 0; s < scanCount; s++) {
          scans.push({
            id: randomUUID(),
            restaurantId,
            tableId: pick(tables).id,
            sessionId: randomUUID(),
            scannedAt: new Date(placedAt.getTime() - Math.floor(Math.random() * 900000)),
          });
        }
      }
    }
  }

  for (let i = 0; i < orders.length; i += 500) {
    await db.order.createMany({ data: orders.slice(i, i + 500) });
  }
  for (let i = 0; i < items.length; i += 1000) {
    await db.orderItem.createMany({ data: items.slice(i, i + 1000) });
  }
  for (let i = 0; i < scans.length; i += 1000) {
    await db.qrScan.createMany({ data: scans.slice(i, i + 1000) });
  }

  console.log(
    `  · ${orders.length} orders, ${items.length} lines, ${scans.length} scans over ${DAYS_OF_HISTORY} days`,
  );
}

async function seedInvoices() {
  const subscriptions = await db.subscription.findMany({ include: { plan: true } });

  for (const sub of subscriptions) {
    if (sub.status === "TRIALING" || sub.plan.pricePaise === 0) continue;
    if ((await db.invoice.count({ where: { subscriptionId: sub.id } })) > 0) continue;

    for (let month = 3; month >= 0; month--) {
      const issuedAt = new Date();
      issuedAt.setMonth(issuedAt.getMonth() - month, 1);
      /* The past-due tenant stops paying on the most recent invoice. */
      const unpaid = sub.status === "PAST_DUE" && month === 0;

      await db.invoice.create({
        data: {
          subscriptionId: sub.id,
          number: `INV-${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, "0")}-${randomBytes(2).toString("hex").toUpperCase()}`,
          amountPaise: sub.plan.pricePaise,
          status: unpaid ? "DUE" : "PAID",
          issuedAt,
          paidAt: unpaid ? null : new Date(issuedAt.getTime() + 86400000),
        },
      });
    }
  }
}

main()
  .then(() => {
    console.log("\nSeeded. Sign in with password123:");
    console.log("  admin@tablet.app          → /admin");
    console.log("  owner@kesartandoor.in     → /dashboard");
    console.log("  manager@kesartandoor.in   → /dashboard (no billing)");
    console.log("  waiter@kesartandoor.in    → orders, POS, tables");
    console.log("  kitchen@kesartandoor.in   → orders only\n");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
