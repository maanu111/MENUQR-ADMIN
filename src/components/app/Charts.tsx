"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/components/charts/EChart";
import { rupeesShort } from "@/lib/money";

/* ECharts needs literal colours. These track the CSS tokens; the categorical
   order is fixed so a series never changes colour when the filter changes. */
const BRAND = "#0284c7";
const BRAND_SOFT = "rgba(2, 132, 199, 0.28)";
const LINE = "#e2e8f0";
const INK3 = "#94a3b8";
const INK = "#0b1220";

const CATEGORICAL = [
  "#0284c7",
  "#0d9488",
  "#7c3aed",
  "#d97706",
  "#db2777",
  "#059669",
  "#4f46e5",
  "#b45309",
];

const tooltipBase = {
  backgroundColor: "#ffffff",
  borderColor: LINE,
  borderWidth: 1,
  padding: [8, 10] as [number, number],
  textStyle: { color: INK, fontSize: 12 },
};

/** Magnitude over time. One series, so no legend — the caption names it. */
export function RevenueChart({
  buckets,
  caption,
  height = 220,
}: {
  buckets: { label: string; value: number }[];
  caption: string;
  height?: number;
}) {
  const max = Math.max(...buckets.map((b) => b.value), 0);
  const peak = buckets.findIndex((b) => b.value === max && max > 0);

  const option = useMemo<EChartsCoreOption>(() => {
    const step = Math.max(1, Math.round(buckets.length / 7));
    return {
      animationDuration: 480,
      animationEasing: "cubicOut",
      grid: { top: 26, right: 6, bottom: 24, left: 6, containLabel: false },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(2,132,199,0.06)" } },
        ...tooltipBase,
        formatter: (params: unknown) => {
          const rows = params as { dataIndex: number; value: number }[];
          const row = rows?.[0];
          if (!row) return "";
          return `<span style="color:${INK3}">${buckets[row.dataIndex].label}</span><br/><b>${rupeesShort(row.value)}</b>`;
        },
      },
      xAxis: {
        type: "category",
        data: buckets.map((b) => b.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: LINE } },
        axisLabel: {
          color: INK3,
          fontSize: 10,
          interval: (index: number) => index % step === 0,
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
          data: buckets.map((b, i) => ({
            value: b.value,
            itemStyle: { color: i === peak ? BRAND : BRAND_SOFT },
          })),
          barCategoryGap: "24%",
          itemStyle: { borderRadius: [3, 3, 0, 0] },
          emphasis: { itemStyle: { color: BRAND } },
          markPoint:
            peak >= 0
              ? {
                  symbol: "roundRect",
                  symbolSize: [52, 18],
                  symbolOffset: [0, -14],
                  itemStyle: { color: BRAND },
                  label: {
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    formatter: () => rupeesShort(max),
                  },
                  data: [{ coord: [peak, max] }],
                }
              : undefined,
        },
      ],
    };
  }, [buckets, max, peak]);

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-ink-2">{caption}</span>
        <span className="num text-[0.6875rem] text-ink-3">
          {max > 0 ? `peak ${rupeesShort(max)}` : "no sales"}
        </span>
      </figcaption>
      <EChart
        option={option}
        height={height}
        className="mt-3"
        ariaLabel={`${caption}. Peak ${rupeesShort(max)}.`}
      />
    </figure>
  );
}

/**
 * Composition. Hues are assigned in fixed order and never cycled, so a slice
 * keeps its colour as the filter changes; anything past the palette folds in.
 */
export function DonutChart({
  slices,
  caption,
  asMoney = true,
  height = 200,
}: {
  slices: { name: string; value: number }[];
  caption: string;
  asMoney?: boolean;
  height?: number;
}) {
  const data = useMemo(() => {
    const sorted = [...slices].sort((a, b) => b.value - a.value);
    if (sorted.length <= CATEGORICAL.length) return sorted;
    const head = sorted.slice(0, CATEGORICAL.length - 1);
    const rest = sorted.slice(CATEGORICAL.length - 1);
    return [
      ...head,
      { name: "Other", value: rest.reduce((sum, s) => sum + s.value, 0) },
    ];
  }, [slices]);

  const total = data.reduce((sum, s) => sum + s.value, 0);

  const option = useMemo<EChartsCoreOption>(
    () => ({
      animationDuration: 480,
      tooltip: {
        trigger: "item",
        ...tooltipBase,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          const shown = asMoney ? rupeesShort(p.value) : String(p.value);
          return `<span style="color:${INK3}">${p.name}</span><br/><b>${shown}</b> · ${p.percent}%`;
        },
      },
      legend: {
        type: "scroll",
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: INK3, fontSize: 11 },
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "82%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          /* A 2px ring in the surface colour separates adjacent slices. */
          itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
          data: data.map((slice, i) => ({
            ...slice,
            itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
          })),
        },
      ],
    }),
    [data, asMoney],
  );

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-ink-2">{caption}</span>
        <span className="num text-[0.6875rem] text-ink-3">
          {asMoney ? rupeesShort(total) : total}
        </span>
      </figcaption>
      <EChart
        option={option}
        height={height}
        className="mt-2"
        ariaLabel={`${caption}. ${data.map((d) => `${d.name} ${d.value}`).join(", ")}.`}
      />
    </figure>
  );
}

/** Ranking. Horizontal bars because dish names need the horizontal room. */
export function RankChart({
  rows,
  caption,
  height = 220,
  asMoney = false,
}: {
  rows: { name: string; value: number }[];
  caption: string;
  height?: number;
  asMoney?: boolean;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    /* ECharts draws the first category at the bottom, so reverse to rank down. */
    const ordered = [...rows].reverse();
    return {
      animationDuration: 480,
      grid: { top: 6, right: 40, bottom: 6, left: 6, containLabel: true },
      tooltip: {
        trigger: "item",
        ...tooltipBase,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number };
          return `<span style="color:${INK3}">${p.name}</span><br/><b>${asMoney ? rupeesShort(p.value) : p.value}</b>`;
        },
      },
      xAxis: { type: "value", show: false },
      yAxis: {
        type: "category",
        data: ordered.map((r) => r.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: INK3, fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: ordered.map((r) => r.value),
          barWidth: 10,
          itemStyle: { color: BRAND_SOFT, borderRadius: [0, 3, 3, 0] },
          emphasis: { itemStyle: { color: BRAND } },
          label: {
            show: true,
            position: "right",
            color: INK3,
            fontSize: 10,
            formatter: (p: { value: number }) =>
              asMoney ? rupeesShort(p.value) : String(p.value),
          },
        },
      ],
    };
  }, [rows, asMoney]);

  return (
    <figure>
      <figcaption className="text-[0.8125rem] font-medium text-ink-2">
        {caption}
      </figcaption>
      <EChart
        option={option}
        height={height}
        className="mt-2"
        ariaLabel={`${caption}. ${rows.map((r) => `${r.name} ${r.value}`).join(", ")}.`}
      />
    </figure>
  );
}
