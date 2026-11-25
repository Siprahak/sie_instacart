"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import Chart from "@/components/Chart";
import KpiTargetCard from "@/components/KpiTargetCard";
import type { Data } from "@/lib/types";
import { fetchDashboardClient } from "@/lib/clientCache";

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => (n * 100).toFixed(1) + "%";
const signed = (v: number) => (v > 0 ? "+" : "") + Math.round(v * 100) + "%";

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {title && <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>}
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min = -0.5,
  max = 0.5,
  step = 0.05,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between font-medium text-slate-700">
        {label}
        <span className={value === 0 ? "text-slate-400" : value > 0 ? "text-emerald-600" : "text-rose-600"}>
          {display}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
    </label>
  );
}

export default function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Parameter What-If Makro
  const [wk, setWk] = useState(0);
  const [hr, setHr] = useState(0);
  const [ro, setRo] = useState(0);

  // Parameter What-If Tertarget
  const [targetDept, setTargetDept] = useState<string>("");
  const [deptBoost, setDeptBoost] = useState(0);
  const [cycleShift, setCycleShift] = useState(0);
  const [extraBasket, setExtraBasket] = useState(0);

  // State Target KPI & Mode Edit
  const [editTarget, setEditTarget] = useState(false);
  const [targets, setTargets] = useState({
    total_orders: 0,
    total_users: 0,
    reorder_rate: 0.62,
    avg_days: 9.5,
    avg_basket_size: 11.0,
    retention_rate: 0.85,
    avg_orders_per_user: 16.0,
    weekend_share: 0.35,
  });

  const [path, setPath] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboardClient()
      .then((res: Data) => {
        setD(res);
        if (res.departments?.[0]) setTargetDept(res.departments[0].department_label);
        setTargets((prev) => ({
          ...prev,
          total_orders: Math.round(res.kpi.total_orders * 1.05),
          total_users: Math.round(res.kpi.total_users * 1.05),
        }));
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const peak = useMemo(
    () =>
      new Set(
        [...(d?.by_hour ?? [])]
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 6)
          .map((h) => h.order_hour_of_day)
      ),
    [d]
  );

  // Perhitungan Simulasi Gabungan
  const sim = useMemo(() => {
    if (!d) return null;

    const baseDays = Math.max(1, d.kpi.avg_days_between_orders);
    const simDays = Math.max(1, baseDays + cycleShift);
    const cycleMultiplier = baseDays / simDays;

    const orderMultiplier = (1 + wk) * cycleMultiplier;
    const orders = d.by_dow.reduce((s, x) => s + x.orders * orderMultiplier, 0);

    const simBasketSize = Math.max(1, d.kpi.avg_basket_size + extraBasket);
    const deptObj = d.departments.find((x) => x.department_label === targetDept);
    const deptExtraItems = deptObj ? deptObj.items * deptBoost : 0;

    const baseSimItems = orders * simBasketSize + deptExtraItems;
    const R = d.kpi.reorder_rate * d.kpi.total_items;
    const R2 = R * (1 + ro) * orderMultiplier;
    const simRate = Math.min(0.99, Math.max(0, R2 / Math.max(1, baseSimItems - R + R2)));

    return {
      orders,
      orderMultiplier,
      rate: simRate,
      basketSize: simBasketSize,
      simDays: Number(simDays.toFixed(1)),
      totalItems: baseSimItems,
    };
  }, [d, wk, ro, cycleShift, extraBasket, targetDept, deptBoost]);

  // Executive Insights Dinamis
  const insights = useMemo(() => {
    if (!d || !sim) return [];

    const topDay = [...d.by_dow].sort((a, b) => b.orders - a.orders)[0];
    const sortedHours = [...d.by_hour].sort((a, b) => b.orders - a.orders);
    const topHour = sortedHours[0];
    const peakOrdersTotal = sortedHours.slice(0, 6).reduce((s, h) => s + h.orders, 0);
    const totalHourlyOrders = d.by_hour.reduce((s, h) => s + h.orders, 0);
    const peakShare = totalHourlyOrders > 0 ? peakOrdersTotal / totalHourlyOrders : 0;

    const topDept = [...d.departments].sort((a, b) => b.items - a.items)[0];
    const loyalDept = [...d.departments].sort((a, b) => b.reorder_rate - a.reorder_rate)[0];

    const deltaOrders = Math.round(sim.orders - d.kpi.total_orders);
    const hasSimulation = wk !== 0 || hr !== 0 || ro !== 0 || deptBoost !== 0 || cycleShift !== 0 || extraBasket !== 0;

    const list = [
      {
        tag: "Operasional & Waktu",
        color: "bg-indigo-50 text-indigo-700 ring-indigo-200",
        title: `Puncak Transaksi: ${topDay?.order_dow_name} (Jam ${String(topHour?.order_hour_of_day).padStart(2, "0")}:00)`,
        desc: `6 jam tersibuk menyumbang ${pct(peakShare)} dari total order harian. Akhir pekan berkontribusi ${pct(d.kpi.weekend_order_share)} terhadap seluruh transaksi.`,
      },
      {
        tag: "Retensi & Siklus Belanja",
        color: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        title: `Retensi Pelanggan ${pct(d.kpi.customer_retention_rate)} · Jeda ${d.kpi.avg_days_between_orders} Hari`,
        desc: `Rata-rata pelanggan melakukan ${d.kpi.avg_orders_per_user}× order dengan ukuran keranjang ${d.kpi.avg_basket_size} item per transaksi.`,
      },
      {
        tag: "Kategori Produk",
        color: "bg-amber-50 text-amber-700 ring-amber-200",
        title: `Volume Tertinggi: ${topDept?.department_label}`,
        desc: `${topDept?.department_label} mendominasi volume (${fmt(topDept?.items ?? 0)} item), sedangkan loyalitas tertinggi berada di ${loyalDept?.department_label} (reorder ${pct(loyalDept?.reorder_rate ?? 0)}).`,
      },
    ];

    if (hasSimulation) {
      list.unshift({
        tag: "Proyeksi What-If Aktif",
        color: deltaOrders >= 0 ? "bg-sky-50 text-sky-700 ring-sky-200" : "bg-rose-50 text-rose-700 ring-rose-200",
        title: `Dampak Skenario: ${deltaOrders >= 0 ? "+" : ""}${fmt(deltaOrders)} Orders (${fmt(sim.totalItems)} Total Items)`,
        desc: `Proyeksi total order menjadi ${fmt(sim.orders)} dengan rata-rata keranjang ${sim.basketSize.toFixed(1)} item, siklus belanja ${sim.simDays} hari, dan reorder rate ${pct(sim.rate)}.`,
      });
    }

    return list;
  }, [d, sim, wk, hr, ro, deptBoost, cycleShift, extraBasket]);

  const weeklyOpt: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, right: 10 },
      grid: { left: 50, right: 10, top: 35, bottom: 30 },
      xAxis: { type: "category", data: (d?.by_dow ?? []).map((x) => x.order_dow_name.slice(0, 3)) },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          name: "Actual",
          barWidth: "66%",
          z: 1,
          itemStyle: { color: "#cbd5e1", borderRadius: [4, 4, 0, 0] },
          data: (d?.by_dow ?? []).map((x) => Math.round(x.orders)),
        },
        {
          type: "bar",
          name: "What-If",
          barWidth: "36%",
          barGap: "-100%",
          z: 2,
          itemStyle: { color: "#4f46e5", borderRadius: [4, 4, 0, 0] },
          data: (d?.by_dow ?? []).map((x) => Math.round(x.orders * (sim?.orderMultiplier ?? 1))),
        },
      ],
    }),
    [d, sim]
  );

  const hourlyOpt: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, right: 10 },
      grid: { left: 50, right: 10, top: 35, bottom: 30 },
      xAxis: { type: "category", data: (d?.by_hour ?? []).map((x) => String(x.order_hour_of_day)) },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          name: "Actual",
          barWidth: "70%",
          z: 1,
          itemStyle: { color: "#cbd5e1", borderRadius: [4, 4, 0, 0] },
          data: (d?.by_hour ?? []).map((x) => Math.round(x.orders)),
        },
        {
          type: "bar",
          name: "What-If",
          barWidth: "38%",
          barGap: "-100%",
          z: 2,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: (d?.by_hour ?? []).map((x) => ({
            value: Math.round(
              x.orders * (peak.has(x.order_hour_of_day) ? 1 + hr : 1) * (sim ? sim.orderMultiplier / (1 + wk) : 1)
            ),
            itemStyle: { color: peak.has(x.order_hour_of_day) ? "#f59e0b" : "#4f46e5" },
          })),
        },
      ],
    }),
    [d, hr, peak, sim, wk]
  );

  const heatOpt: EChartsOption = useMemo(() => {
    const cells = d?.heatmap_dow_hour ?? [];
    const days = (d?.by_dow ?? []).map((x) => x.order_dow_name);
    const max = Math.max(1, ...cells.map((x) => x.orders));
    return {
      tooltip: {
        formatter: (p: any) =>
          `${days[p.value[1]]}, jam ${String(p.value[0]).padStart(2, "0")}:00<br/><b>${fmt(p.value[2])}</b> orders`,
      },
      grid: { left: 90, right: 20, top: 10, bottom: 90 },
      xAxis: {
        type: "category",
        data: Array.from({ length: 24 }, (_, i) => String(i)),
        name: "Jam",
        nameLocation: "middle",
        nameGap: 28,
      },
      yAxis: { type: "category", data: days, inverse: true },
      visualMap: {
        min: 0,
        max,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        formatter: (v: any) => fmt(Number(v)),
        inRange: { color: ["#eef2ff", "#a5b4fc", "#4f46e5", "#1e1b4b"] },
      },
      series: [
        {
          type: "heatmap",
          data: cells.map((x) => ({
            value: [x.order_hour_of_day, x.order_dow, x.orders],
            label: { color: x.orders > max * 0.45 ? "#ffffff" : "#334155" },
          })),
          itemStyle: { borderColor: "#ffffff", borderWidth: 2, borderRadius: 3 },
          label: { show: true, fontSize: 10, formatter: (p: any) => (p.value[2] / 1000).toFixed(1) + "k" },
          emphasis: { itemStyle: { borderColor: "#f59e0b", borderWidth: 2 } },
        },
      ],
    };
  }, [d]);

  const breakdown = useMemo(() => {
    if (!d) return [];
    const rows =
      path.length === 0
        ? d.departments.map((x) => ({
            dept: x.department_label,
            name: x.department_label,
            items: x.items,
            re: x.reordered_items,
          }))
        : path.length === 1
        ? d.aisles
            .filter((a) => a.department_label === path[0])
            .map((x) => ({ dept: x.department_label, name: x.aisle, items: x.items, re: x.reordered_items }))
        : d.products
            .filter((p) => p.department_label === path[0] && p.aisle === path[1])
            .map((x) => ({ dept: x.department_label, name: x.product_name, items: x.items, re: x.reordered_items }));
    return rows.sort((a, b) => b.items - a.items).slice(0, 15);
  }, [d, path]);

  const breakOpt: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0 },
      grid: { left: 140, right: 20, top: 30, bottom: 20 },
      xAxis: { type: "value" },
      yAxis: { type: "category", inverse: true, data: breakdown.map((r) => r.name) },
      series: [
        {
          type: "bar",
          name: "Actual",
          barWidth: "68%",
          z: 1,
          itemStyle: { color: "#cbd5e1", borderRadius: [0, 4, 4, 0] },
          data: breakdown.map((r) => r.items),
        },
        {
          type: "bar",
          name: "What-If",
          barWidth: "36%",
          barGap: "-100%",
          z: 2,
          itemStyle: { color: "#4f46e5", borderRadius: [0, 4, 4, 0] },
          data: breakdown.map((r) => {
            const deptFactor = r.dept === targetDept ? 1 + deptBoost : 1;
            const basketFactor = d ? (d.kpi.avg_basket_size + extraBasket) / Math.max(1, d.kpi.avg_basket_size) : 1;
            const baseSim = (r.items - r.re + r.re * (1 + ro)) * deptFactor * basketFactor;
            return Math.round(baseSim);
          }),
        },
      ],
    }),
    [breakdown, ro, targetDept, deptBoost, extraBasket, d]
  );

  const drill = useCallback((p: { name: string }) => setPath((cur) => (cur.length < 2 ? [...cur, p.name] : cur)), []);

  if (err) return <main className="p-8 text-rose-600">Gagal memuat data: {err}</main>;
  if (!d || !sim) return <main className="p-8 text-slate-500">Memuat data…</main>;

  const k = d.kpi;
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Overview & Simulasi</h1>
          <p className="text-sm text-slate-500">
            Pemantauan 8 KPI strategis vs target, pola waktu, dan simulasi What-If berbasis data.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          ← Main Menu
        </Link>
      </header>

      {/* Grid 8 KPI dengan 1 Donut Chart Target Individu per KPI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pencapaian Indikator Kinerja Utama (Aktual vs Target)
          </h2>
          <button
            type="button"
            onClick={() => setEditTarget((v) => !v)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-indigo-50"
          >
            {editTarget ? "✓ Selesai Atur Target" : "⚙ Atur Target KPI"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTargetCard
            label="Total Orders"
            actualValue={sim.orders}
            targetValue={targets.total_orders}
            formattedActual={fmt(sim.orders)}
            formattedTarget={fmt(targets.total_orders)}
            isEditing={editTarget}
            step={100}
            onTargetChange={(v) => setTargets({ ...targets, total_orders: v })}
          />
          <KpiTargetCard
            label="Total Users"
            actualValue={k.total_users}
            targetValue={targets.total_users}
            formattedActual={fmt(k.total_users)}
            formattedTarget={fmt(targets.total_users)}
            isEditing={editTarget}
            step={50}
            onTargetChange={(v) => setTargets({ ...targets, total_users: v })}
          />
          <KpiTargetCard
            label="Reorder Rate"
            actualValue={sim.rate}
            targetValue={targets.reorder_rate}
            formattedActual={pct(sim.rate)}
            formattedTarget={pct(targets.reorder_rate)}
            isEditing={editTarget}
            step={0.01}
            onTargetChange={(v) => setTargets({ ...targets, reorder_rate: v })}
          />
          <KpiTargetCard
            label="Rata-rata Jeda Order"
            actualValue={sim.simDays}
            targetValue={targets.avg_days}
            formattedActual={`${sim.simDays} hr`}
            formattedTarget={`≤ ${targets.avg_days} hr`}
            lowerIsBetter={true}
            isEditing={editTarget}
            step={0.5}
            onTargetChange={(v) => setTargets({ ...targets, avg_days: v })}
          />
          <KpiTargetCard
            label="Average Basket Size"
            actualValue={sim.basketSize}
            targetValue={targets.avg_basket_size}
            formattedActual={`${sim.basketSize.toFixed(1)} item`}
            formattedTarget={`${targets.avg_basket_size} item`}
            isEditing={editTarget}
            step={0.5}
            onTargetChange={(v) => setTargets({ ...targets, avg_basket_size: v })}
          />
          <KpiTargetCard
            label="Customer Retention"
            actualValue={k.customer_retention_rate}
            targetValue={targets.retention_rate}
            formattedActual={pct(k.customer_retention_rate)}
            formattedTarget={pct(targets.retention_rate)}
            isEditing={editTarget}
            step={0.01}
            onTargetChange={(v) => setTargets({ ...targets, retention_rate: v })}
          />
          <KpiTargetCard
            label="Avg Orders / User"
            actualValue={k.avg_orders_per_user}
            targetValue={targets.avg_orders_per_user}
            formattedActual={`${k.avg_orders_per_user}×`}
            formattedTarget={`${targets.avg_orders_per_user}×`}
            isEditing={editTarget}
            step={0.5}
            onTargetChange={(v) => setTargets({ ...targets, avg_orders_per_user: v })}
          />
          <KpiTargetCard
            label="Weekend Order Share"
            actualValue={k.weekend_order_share}
            targetValue={targets.weekend_share}
            formattedActual={pct(k.weekend_order_share)}
            formattedTarget={pct(targets.weekend_share)}
            isEditing={editTarget}
            step={0.01}
            onTargetChange={(v) => setTargets({ ...targets, weekend_share: v })}
          />
        </div>
      </div>

      {/* Executive Insights */}
      <Card title="Executive Insights & Rekomendasi Strategis">
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
              <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${item.color}`}>
                {item.tag}
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Panel Simulasi What-If Lengkap (6 Parameter) */}
      <Card title="Simulasi What-If (Skenario Makro & Tertarget)">
        <div className="grid gap-6 md:grid-cols-3">
          <Slider label="Weekly (semua hari)" value={wk} display={signed(wk)} onChange={setWk} />
          <Slider label="Peak Hours (6 jam tersibuk)" value={hr} display={signed(hr)} onChange={setHr} />
          <Slider label="Reorder Rate" value={ro} display={signed(ro)} onChange={setRo} />

          <Slider
            label="Percepatan Siklus Belanja (Hari)"
            value={cycleShift}
            min={-5}
            max={5}
            step={1}
            display={cycleShift === 0 ? "0 hari" : `${cycleShift > 0 ? "+" : ""}${cycleShift} hari`}
            onChange={setCycleShift}
          />
          <Slider
            label="Penambahan Item / Keranjang"
            value={extraBasket}
            min={0}
            max={5}
            step={0.5}
            display={extraBasket === 0 ? "+0 item" : `+${extraBasket} item`}
            onChange={setExtraBasket}
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-700">Kampanye Department:</span>
              <select
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-800"
              >
                {d.departments.map((dep) => (
                  <option key={dep.department_label} value={dep.department_label}>
                    {dep.department_label}
                  </option>
                ))}
              </select>
            </div>
            <Slider
              label="Target Pertumbuhan Dept"
              value={deptBoost}
              min={-0.5}
              max={1}
              step={0.05}
              display={signed(deptBoost)}
              onChange={setDeptBoost}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Weekly Breakdown – orders per hari (Actual vs What-If)">
          <Chart option={weeklyOpt} />
        </Card>
        <Card title="Hourly Breakdown – orders per jam (kuning = peak hours)">
          <Chart option={hourlyOpt} />
        </Card>
      </div>

      <Card title="Heatmap Orders: hari × jam (angka dalam ribuan order; makin gelap = makin ramai)">
        <Chart option={heatOpt} height={460} />
      </Card>

      <Card title="Items Breakdown – Actual vs What-If (klik bar untuk drill-down)">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => setPath([])} className="rounded bg-indigo-50 px-2 py-1 text-indigo-700 hover:bg-indigo-100">
            Department
          </button>
          {path.map((p, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-slate-400">›</span>
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                className="rounded bg-indigo-50 px-2 py-1 text-indigo-700 hover:bg-indigo-100"
              >
                {p}
              </button>
            </span>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            {["Department", "Aisle", "Produk"][path.length]} · top 15
          </span>
        </div>
        <Chart option={breakOpt} height={480} onClick={drill} />
      </Card>

      <footer className="pt-2 text-xs text-slate-400">
        Catatan data: {d.meta.warning} Pemetaan hari: {d.meta.dow_mapping_assumption}.
      </footer>
    </main>
  );
}