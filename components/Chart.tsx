"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

interface ChartProps {
  option: EChartsOption;
  height?: number;
  onClick?: (params: any) => void;
}

export default function Chart({ option, height = 300, onClick }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const existing = echarts.getInstanceByDom(el);
    if (existing) existing.dispose();

    const chart = echarts.init(el);
    instanceRef.current = chart;

    // ResizeObserver memastikan chart langsung muncul saat container mendapat lebar/tinggi
    const observer = new ResizeObserver(() => {
      if (!chart.isDisposed()) {
        chart.resize();
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (!chart.isDisposed()) chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart || chart.isDisposed()) return;

    chart.setOption(option, true);
    chart.resize();

    chart.off("click");
    if (onClick) {
      chart.on("click", onClick);
    }
  }, [option, onClick]);

  return <div ref={containerRef} style={{ width: "100%", height: `${height}px` }} />;
}