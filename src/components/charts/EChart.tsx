"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkPointComponent,
  LegendComponent,
  DatasetComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

/* Tree-shaken registration — only what the dashboard actually draws. */
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  MarkPointComponent,
  LegendComponent,
  DatasetComponent,
  CanvasRenderer,
]);

/**
 * Thin wrapper over ECharts: mounts on the client, keeps a single instance,
 * follows container resizes, and disposes cleanly. Charts pass options only —
 * no chart owns its own sizing or lifecycle.
 */
export function EChart({
  option,
  height = 160,
  className = "",
  ariaLabel,
}: {
  option: EChartsCoreOption;
  height?: number;
  className?: string;
  ariaLabel: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const instance = echarts.init(host.current, undefined, {
      renderer: "canvas",
    });
    chart.current = instance;

    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(host.current);

    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  /* Options change on every filter switch; notMerge keeps stale series out. */
  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={ariaLabel}
      style={{ height }}
      className={`w-full ${className}`}
    />
  );
}
