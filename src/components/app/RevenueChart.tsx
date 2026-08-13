"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/components/charts/EChart";
import { rupeesShort } from "@/lib/money";

const BRAND = "#0284c7";
const BRAND_SOFT = "rgba(2, 132, 199, 0.28)";
const LINE = "#e2e8f0";
const INK3 = "#94a3b8";
const INK = "#0b1220";

/**
 * One series, so no legend — the caption names it. The peak is the only bar
 * labelled, because a number on every bar is noise at 24 buckets.
 */
export function RevenueChart({
  buckets,
  caption,
}: {
  buckets: { label: string; value: number }[];
  caption: string;
}) {
  const max = Math.max(...buckets.map((b) => b.value), 0);
  const peak = buckets.findIndex((b) => b.value === max && max > 0);

  const option = useMemo<EChartsCoreOption>(() => {
    /* Show roughly six ticks whatever the bucket count. */
    const step = Math.max(1, Math.round(buckets.length / 6));

    return {
      animationDuration: 480,
      animationEasing: "cubicOut",
      grid: { top: 24, right: 4, bottom: 24, left: 4, containLabel: false },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: { color: "rgba(2,132,199,0.06)" },
        },
        backgroundColor: "#ffffff",
        borderColor: LINE,
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: INK, fontSize: 12 },
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
                  symbolSize: [50, 18],
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
          {max > 0 ? `peak ${rupeesShort(max)}` : "no sales yet"}
        </span>
      </figcaption>
      <EChart
        option={option}
        height={200}
        className="mt-3"
        ariaLabel={`${caption}. Peak ${rupeesShort(max)}.`}
      />
    </figure>
  );
}
