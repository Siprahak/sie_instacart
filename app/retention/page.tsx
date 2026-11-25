"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import type { Data } from "@/lib/types";

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

export default function RetentionPage() {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setD);
  }, []);

  const cycleChartOpt: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: 55, right: 20, top: 25, bottom: 40 },
      xAxis: {
        type: "category",
        name: "Jeda Hari Sejak Order Sebelumnya",
        nameLocation: "middle",
        nameGap: 25,
        data: (d?.days_prior_dist ?? []).map((x) => `${x.days} hr`),
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          name: "Jumlah Order",
          itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
          data: (d?.days_prior_dist ?? []).map((x) => x.orders),
        },
      ],
    }),
    [d]
  );

  const userSplitOpt: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "item", formatter: "{b}: <b>{c}</b> ({d}%)" },
      legend: { bottom: 0 },
      series: [
        {
          type: "pie",
          radius: ["45%", "72%"],
          label: { show: false },
          data: d
            ? [
                { name: "Repeat Users (>1 Order)", value: d.retention_summary.repeat_users, itemStyle: { color: "#4f46e5" } },
                { name: "One-Time Users (1 Order)", value: d.retention_summary.one_time_users, itemStyle: { color: "#cbd5e1" } },
              ]
            : [],
        },
      ],
    }),
    [d]
  );

  if (!d) return <main className="p-8 text-slate-500">Memuat analisis pelanggan…</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analisis Retensi & Perilaku Pelanggan</h1>
          <p className="text-sm text-slate-500">Evaluasi loyalitas pelanggan baru vs berulang serta siklus waktu belanja kembali.</p>
        </div>
        <Link href="/" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          ← Main Menu
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">Customer Retention Rate</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{pct(d.kpi.customer_retention_rate)}</p>
          <p className="mt-1 text-xs text-slate-400">{fmt(d.retention_summary.repeat_users)} pelanggan loyal</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">Avg Orders / User</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{d.kpi.avg_orders_per_user}×</p>
          <p className="mt-1 text-xs text-slate-400">Rata-rata frekuensi belanja</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">Order Pelanggan Baru</p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">{fmt(d.retention_summary.first_time_orders)}</p>
          <p className="mt-1 text-xs text-slate-400">is_first_order = 1</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">Order Pelanggan Berulang</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{fmt(d.retention_summary.repeat_orders)}</p>
          <p className="mt-1 text-xs text-slate-400">is_first_order = 0</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Komposisi Basis Pelanggan</h2>
          <Chart option={userSplitOpt} height={300} />
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Distribusi Siklus Belanja Ulang (Jeda Hari Antar Order)
          </h2>
          <Chart option={cycleChartOpt} height={300} />
        </section>
      </div>
    </main>
  );
}