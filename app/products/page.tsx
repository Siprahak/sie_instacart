"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import type { Data } from "@/lib/types";
import { fetchDashboardClient } from "../../lib/clientCache";

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

export default function ProductsAnalyticsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardClient()
      .then(setD)
      .catch((e: unknown) => setErr(String(e)));
  }, []);

  const firstCartOpt: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 180, right: 25, top: 15, bottom: 25 },
      xAxis: { type: "value" },
      yAxis: {
        type: "category",
        inverse: true,
        data: (d?.top_first_cart ?? []).map((x) => x.product_name),
      },
      series: [
        {
          type: "bar",
          name: "Dipilih Pertama Kali (Cart #1)",
          itemStyle: { color: "#f59e0b", borderRadius: [0, 4, 4, 0] },
          data: (d?.top_first_cart ?? []).map((x) => x.first_cart_count),
        },
      ],
    }),
    [d],
  );

  if (err)
    return <main className="p-8 text-rose-600">Gagal memuat data: {err}</main>;
  if (!d)
    return <main className="p-8 text-slate-500">Memuat performa produk…</main>;

  const topLoyalProducts = [...d.products]
    .filter((p) => p.items >= 20)
    .sort((a, b) => b.reorder_rate - a.reorder_rate)
    .slice(0, 15);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Performa Produk & Katalog Strategis
          </h1>
          <p className="text-sm text-slate-500">
            Analisis produk pemicu keranjang belanja dan tingkat pembelian
            berulang per SKU.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          ← Main Menu
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">
            Average Basket Size
          </p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">
            {d.kpi.avg_basket_size} item
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Rata-rata item per keranjang
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">SKU Aktif Terjual</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {fmt(d.kpi.total_products)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Produk memiliki riwayat order
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs uppercase text-slate-500">Total Department</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {d.departments.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Kategori utama katalog</p>
        </div>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">
          Top 15 Produk Pemicu Belanja (Add-to-Cart Order = 1)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Produk yang paling sering dimasukkan pertama kali ke keranjang saat
          pelanggan memulai transaksi.
        </p>
        <Chart option={firstCartOpt} height={420} />
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Top 15 Produk dengan Reorder Rate Tertinggi (Min. 20 Transaksi)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Produk</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Aisle</th>
                <th className="px-4 py-2.5 text-right">Total Terjual</th>
                <th className="px-4 py-2.5 text-right">Reorder Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topLoyalProducts.map((p) => (
                <tr key={p.product_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {p.product_name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {p.department_label}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{p.aisle}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {fmt(p.items)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                    {pct(p.reorder_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
