"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Data } from "@/lib/types";
import { fetchDashboardClient, clearClientDashboardCache } from "@/lib/clientCache";

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => (n * 100).toFixed(1) + "%";

export default function MainMenuPage() {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    fetchDashboardClient()
      .then(setD)
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout gagal:", e);
    } finally {
      clearClientDashboardCache();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login?logout=1";
    }
  };

  const menus = [
    {
      title: "Executive Overview & Simulasi",
      href: "/dashboard",
      badge: "Core SIE",
      badgeColor: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      desc: "Pantau 8 KPI utama vs target, Executive Insights, heatmap jam sibuk, serta simulasi What-If (kampanye department, percepatan siklus belanja, dan ekspansi keranjang).",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      title: "Analisis Retensi & Perilaku Pelanggan",
      href: "/retention",
      badge: "Customer Intelligence",
      badgeColor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      desc: "Evaluasi rasio pelanggan baru vs repeat buyer, distribusi siklus jeda hari antar-transaksi, serta tingkat loyalitas basis pengguna.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      title: "Performa Produk & Katalog Strategis",
      href: "/products",
      badge: "Merchandising",
      badgeColor: "bg-amber-50 text-amber-700 ring-amber-200",
      desc: "Identifikasi produk pemicu keranjang pertama (First-Cart Starters), kontribusi department, dan peringkat produk dengan tingkat repeat order tertinggi.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      title: "Manajemen & Input Data Transaksi",
      href: "/input-data",
      badge: "Data Operations",
      badgeColor: "bg-sky-50 text-sky-700 ring-sky-200",
      desc: "Tambahkan transaksi order baru secara satuan lewat formulir, unggah data massal Excel (.xlsx), dan pantau 100 transaksi terbaru di database.",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Sistem Informasi Eksekutif
          </span>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">SIE Instacart – Executive Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pilih modul analisis strategis, simulasi keputusan, atau pengelolaan data transaksi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200"
        >
          Keluar
        </button>
      </header>

      {/* Ringkasan 8 KPI Eksekutif */}
      {d && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ringkasan Indikator Kinerja Utama (8 KPI)
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(d.kpi.total_orders)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Total Users</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(d.kpi.total_users)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Reorder Rate</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">{pct(d.kpi.reorder_rate)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Rata-rata Jeda Order</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{d.kpi.avg_days_between_orders} hari</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Average Basket Size</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{d.kpi.avg_basket_size} item</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Customer Retention Rate</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{pct(d.kpi.customer_retention_rate)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Avg Orders / User</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{d.kpi.avg_orders_per_user}× order</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Weekend Order Share</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{pct(d.kpi.weekend_order_share)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Grid 4 Kartu Main Menu */}
      <section className="grid gap-5 md:grid-cols-2">
        {menus.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  {m.icon}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${m.badgeColor}`}>
                  {m.badge}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-indigo-600">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{m.desc}</p>
            </div>

            <div className="mt-6 flex items-center text-sm font-semibold text-indigo-600">
              Buka Modul
              <span className="ml-1.5 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}