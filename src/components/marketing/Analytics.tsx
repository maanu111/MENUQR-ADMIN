"use client";

import { useMemo, useState } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/components/charts/EChart";
import { Section } from "./Section";

type RangeKey = "day" | "week" | "month";

type Range = {
  label: string;
  caption: string;
  byHour: boolean;
  series: number[];
  ticks: { at: number; label: string }[];
  stats: { label: string; value: string; delta: string; up: boolean }[];
};

const RANGES: Record<RangeKey, Range> = {
  day: {
    label: "Today",
    caption: "Revenue by hour",
    byHour: true,
    series: [
      2000, 0, 0, 0, 0, 0, 0, 1200, 3400, 5100, 6200, 9300, 22400, 38100, 31200,
      14300, 9100, 12600, 18400, 34200, 52300, 47100, 26400, 9200,
    ],
    ticks: [
      { at: 0, label: "00" },
      { at: 6, label: "06" },
      { at: 12, label: "12" },
      { at: 18, label: "18" },
      { at: 23, label: "23" },
    ],
    stats: [
      { label: "Orders", value: "214", delta: "+12%", up: true },
      { label: "Covers", value: "583", delta: "+9%", up: true },
      { label: "Avg ticket", value: "₹1,180", delta: "+4%", up: true },
      { label: "QR scans", value: "402", delta: "−3%", up: false },
    ],
  },
  week: {
    label: "Week",
    caption: "Revenue by day",
    byHour: false,
    series: [186000, 174000, 192000, 205000, 288000, 341000, 302000],
    ticks: [
      { at: 0, label: "Mon" },
      { at: 3, label: "Thu" },
      { at: 6, label: "Sun" },
    ],
    stats: [
      { label: "Orders", value: "1,486", delta: "+8%", up: true },
      { label: "Covers", value: "4,012", delta: "+11%", up: true },
      { label: "Avg ticket", value: "₹1,205", delta: "+2%", up: true },
      { label: "QR scans", value: "2,733", delta: "+6%", up: true },
    ],
  },
  month: {
    label: "Month",
    caption: "Revenue by day",
    byHour: false,
    series: [
      182, 176, 190, 210, 288, 335, 301, 178, 168, 195, 202, 279, 348, 312, 190,
      182, 201, 218, 294, 356, 322, 199, 188, 206, 224, 301, 362, 330, 212, 204,
    ].map((v) => v * 1000),
    ticks: [
      { at: 0, label: "1" },
      { at: 9, label: "10" },
      { at: 19, label: "20" },
      { at: 29, label: "30" },
    ],
    stats: [
      { label: "Orders", value: "6,240", delta: "+17%", up: true },
      { label: "Covers", value: "16,880", delta: "+15%", up: true },
      { label: "Avg ticket", value: "₹1,192", delta: "−1%", up: false },
      { label: "QR scans", value: "11,905", delta: "+21%", up: true },
    ],
  },
};

const TOP_ITEMS = [
  { name: "Butter Chicken", sold: 84 },
  { name: "Garlic Kulcha", sold: 76 },
  { name: "Dal Makhani", sold: 61 },
  { name: "Mutton Biryani", sold: 52 },
];

const SLOW_ITEMS = [
  { name: "Chilli Mushroom", sold: 3 },
  { name: "Kulfi Falooda", sold: 5 },
  { name: "Jeera Rice", sold: 7 },
];

const COVERAGE = [
  "Daily, weekly, monthly",
  "Sales by hour",
  "Best & worst sellers",
  "Scan times per table",
  "Covers per table",
  "Margins by item",
];

function money(rupees: number) {
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${Math.round(rupees / 1000)}k`;
  return `₹${rupees}`;
}

/* ECharts needs literal colours; these mirror the CSS tokens exactly. */
const BRAND = "#0284c7";
const BRAND_SOFT = "rgba(2, 132, 199, 0.3)";
const LINE = "#e2e8f0";
const INK3 = "#94a3b8";
const INK = "#0b1220";

/** One series, so no legend — the caption names it. Peak is emphasised. */
function useRevenueOption(range: Range): EChartsCoreOption {
  return useMemo(() => {
    const max = Math.max(...range.series);
    const peak = range.series.indexOf(max);
    const labels = range.series.map((_, i) =>
      range.byHour ? `${String(i).padStart(2, "0")}:00` : `Day ${i + 1}`,
    );
    const showAt = new Set(range.ticks.map((t) => t.at));

    return {
      animationDuration: 520,
      animationEasing: "cubicOut",
      grid: { top: 18, right: 2, bottom: 22, left: 2, containLabel: false },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(2,132,199,0.06)" } },
        backgroundColor: "#ffffff",
        borderColor: LINE,
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: INK, fontSize: 12 },
        formatter: (params: unknown) => {
          const rows = params as { dataIndex: number; value: number }[];
          const row = rows?.[0];
          if (!row) return "";
          return `<span style="color:${INK3}">${labels[row.dataIndex]}</span><br/><b>${money(row.value)}</b>`;
        },
      },
      xAxis: {
        type: "category",
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: LINE } },
        axisLabel: {
          color: INK3,
          fontSize: 10,
          interval: (i: number) => showAt.has(i),
          formatter: (_v: string, i: number) =>
            range.ticks.find((t) => t.at === i)?.label ?? "",
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { lineStyle: { color: LINE } },
      },
      series: [
        {
          type: "bar",
          data: range.series.map((v, i) => ({
            value: v,
            itemStyle: { color: i === peak ? BRAND : BRAND_SOFT },
          })),
          barCategoryGap: "22%",
          itemStyle: { borderRadius: [3, 3, 0, 0] },
          emphasis: { itemStyle: { color: BRAND } },
          markPoint: {
            symbol: "roundRect",
            symbolSize: [46, 18],
            symbolOffset: [0, -14],
            itemStyle: { color: BRAND },
            label: {
              color: "#fff",
              fontSize: 10,
              fontWeight: 600,
              formatter: () => money(max),
            },
            data: [{ coord: [peak, max] }],
          },
        },
      ],
    };
  }, [range]);
}

function RevenueChart({ range }: { range: Range }) {
  const option = useRevenueOption(range);

  return (
    <figure className="mt-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-2">{range.caption}</span>
        <span className="num text-[0.6875rem] text-ink-3">
          peak {money(Math.max(...range.series))}
        </span>
      </figcaption>

      <EChart
        option={option}
        height={168}
        className="mt-2"
        ariaLabel={`${range.caption}, peak ${money(Math.max(...range.series))}`}
      />
    </figure>
  );
}

function ItemList({
  title,
  items,
  tone,
}: {
  title: string;
  items: { name: string; sold: number }[];
  tone: "good" | "slow";
}) {
  const max = Math.max(...items.map((i) => i.sold));
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className={tone === "good" ? "text-good" : "text-warn"}>
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
            <path
              d={
                tone === "good"
                  ? "M6 10V2M2.5 5.5 6 2l3.5 3.5"
                  : "M6 2v8M2.5 6.5 6 10l3.5-3.5"
              }
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h4 className="text-xs font-semibold text-ink">{title}</h4>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.name} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 truncate text-[0.75rem] text-ink-2 sm:w-28">
              {item.name}
            </span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className={`block h-full rounded-full ${
                  tone === "good" ? "bg-brand" : "bg-line-strong"
                }`}
                style={{ width: `${(item.sold / max) * 100}%` }}
              />
            </span>
            <span className="num w-6 shrink-0 text-right text-[0.75rem] text-ink">
              {item.sold}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Analytics() {
  const [key, setKey] = useState<RangeKey>("day");
  const range = RANGES[key];

  return (
    <Section
      id="reports"
      label="Reports"
      title="Every question the owner actually asks."
      lede="Not a wall of charts. The handful of numbers that decide what to cook tomorrow and which dish to take off the menu."
    >
      {/* Coverage reads as an inline row of chips, not a bullet stack. */}
      <ul className="no-bar -mx-5 mb-6 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {COVERAGE.map((c) => (
          <li
            key={c}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[0.6875rem] text-ink-2"
          >
            {c}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-line bg-ground p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Report range"
            className="flex gap-1 rounded-lg bg-surface-2 p-1"
          >
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={key === k}
                type="button"
                onClick={() => setKey(k)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  key === k
                    ? "bg-ground text-ink shadow-[0_1px_2px_rgb(11_18_32/0.08)]"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {RANGES[k].label}
              </button>
            ))}
          </div>
          <span className="num text-[0.6875rem] text-ink-3">
            Kesar Tandoor · Tables 1–14
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {range.stats.map((s) => (
            <div key={s.label} className="bg-ground p-3">
              <dt className="text-[0.625rem] text-ink-3">{s.label}</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{s.value}</dd>
              <dd
                className={`num text-[0.5625rem] ${s.up ? "text-good" : "text-warn"}`}
              >
                {s.delta} vs last
              </dd>
            </div>
          ))}
        </dl>

        <RevenueChart range={range} />

        <div className="mt-6 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
          <ItemList title="Selling fastest" items={TOP_ITEMS} tone="good" />
          <ItemList title="Barely moving" items={SLOW_ITEMS} tone="slow" />
        </div>
      </div>
    </Section>
  );
}
