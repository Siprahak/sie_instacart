"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface Department {
  department_id: number;
  department_label: string;
}
interface Aisle {
  aisle_id: number;
  aisle: string;
  department_id: number;
}
interface Product {
  product_id: number;
  product_name: string;
  aisle: string;
  department_label: string;
}
interface CartItem {
  product_id: number;
  product_name: string;
  reordered: number;
}

const DAYS = ["0 - Minggu", "1 - Senin", "2 - Selasa", "3 - Rabu", "4 - Kamis", "5 - Jumat", "6 - Sabtu"];

export default function InputDataPage() {
  const [tab, setTab] = useState<"form" | "excel">("form");
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Katalog & Pencarian Produk
  const [departments, setDepartments] = useState<Department[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedAisle, setSelectedAisle] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // State Form Order
  const [userId, setUserId] = useState<string>("1001");
  const [orderDow, setOrderDow] = useState<number>(0);
  const [orderHour, setOrderHour] = useState<number>(10);
  const [daysPrior, setDaysPrior] = useState<string>("7");
  const [cart, setCart] = useState<CartItem[]>([]);

  // State Upload Excel
  const [excelOrders, setExcelOrders] = useState<any[]>([]);
  const [excelPreviewRows, setExcelPreviewRows] = useState<any[]>([]);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
const [loadingRecent, setLoadingRecent] = useState(false);

const fetchRecentOrders = () => {
  setLoadingRecent(true);
  fetch("/api/orders")
    .then((r) => r.json())
    .then((data) => setRecentOrders(data.recent_orders ?? []))
    .finally(() => setLoadingRecent(false));
};

useEffect(() => {
  fetchRecentOrders();
}, []);

  // Muat daftar Department & Aisle saat halaman dibuka
  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => {
        setDepartments(data.departments ?? []);
        setAisles(data.aisles ?? []);
      });
  }, []);

  const filteredAisles = useMemo(
    () => (selectedDept ? aisles.filter((a) => a.department_id === Number(selectedDept)) : []),
    [aisles, selectedDept]
  );

  // Cari produk berdasarkan Aisle atau kata kunci
  useEffect(() => {
    if (!selectedAisle && searchQuery.trim().length < 2) {
      setProductResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoadingProducts(true);
      const params = new URLSearchParams();
      if (selectedAisle) params.set("aisle_id", selectedAisle);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      fetch(`/api/catalog?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setProductResults(data.products ?? []))
        .finally(() => setLoadingProducts(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedAisle, searchQuery]);

  const addToCart = (prod: Product) => {
    if (cart.some((c) => c.product_id === prod.product_id)) return;
    setCart([...cart, { product_id: prod.product_id, product_name: prod.product_name, reordered: 0 }]);
  };

  const toggleReordered = (productId: number) => {
    setCart(cart.map((c) => (c.product_id === productId ? { ...c, reordered: c.reordered === 1 ? 0 : 1 } : c)));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((c) => c.product_id !== productId));
  };

  // Submit Form Manual
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (cart.length === 0) {
      setStatus({ type: "error", text: "Pilih minimal 1 produk ke dalam daftar order." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(userId),
          order_dow: orderDow,
          order_hour_of_day: orderHour,
          days_since_prior_order: daysPrior === "" ? null : Number(daysPrior),
          items: cart.map((c) => ({ product_id: c.product_id, reordered: c.reordered })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", text: data.message });
      } else {
        setStatus({ type: "success", text: data.message });
        setCart([]);
      }
    } catch {
      setStatus({ type: "error", text: "Gagal menghubungi server." });
    } finally {
      setSubmitting(false);
    }
  };

  // Download Template Excel (.xlsx)
  const downloadTemplate = () => {
    const sampleData = [
      {
        order_group: 1,
        user_id: 205001,
        order_dow: 0,
        order_hour_of_day: 14,
        days_since_prior_order: 7,
        product_id: 1,
        reordered: 1,
      },
      {
        order_group: 1,
        user_id: 205001,
        order_dow: 0,
        order_hour_of_day: 14,
        days_since_prior_order: 7,
        product_id: 2,
        reordered: 0,
      },
      {
        order_group: 2,
        user_id: 205002,
        order_dow: 5,
        order_hour_of_day: 18,
        days_since_prior_order: "",
        product_id: 10,
        reordered: 0,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Orders");
    XLSX.writeFile(wb, "template_input_sie_instacart.xlsx");
  };

  // Baca File Excel yang di-upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        setExcelPreviewRows(rows.slice(0, 15));

        // Kelompokkan baris berdasarkan order_group (jika ada) atau tiap baris menjadi 1 order
        const grouped = new Map<string, any>();
        rows.forEach((r, idx) => {
          const key = r.order_group !== undefined ? `grp_${r.order_group}` : `row_${idx}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              user_id: Number(r.user_id),
              order_dow: Number(r.order_dow),
              order_hour_of_day: Number(r.order_hour_of_day),
              days_since_prior_order:
                r.days_since_prior_order === "" || r.days_since_prior_order === undefined
                  ? null
                  : Number(r.days_since_prior_order),
              items: [],
            });
          }
          grouped.get(key).items.push({
            product_id: Number(r.product_id),
            reordered: Number(r.reordered) ? 1 : 0,
          });
        });

        setExcelOrders(Array.from(grouped.values()));
      } catch {
        setStatus({ type: "error", text: "Format file Excel tidak dapat dibaca." });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Data Excel ke MySQL
  const handleExcelSubmit = async () => {
    if (excelOrders.length === 0) return;
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: excelOrders }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", text: data.message });
      } else {
        setStatus({ type: "success", text: data.message });
        setExcelOrders([]);
        setExcelPreviewRows([]);
      }
    } catch {
      setStatus({ type: "error", text: "Gagal mengunggah data Excel ke server." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Input Data Transaksi Order</h1>
          <p className="text-sm text-slate-500">Tambahkan data order baru melalui formulir manual atau unggah file Excel (.xlsx).</p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          ← Main Menu
        </Link>
      </header>

      {/* Switcher Tab */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setTab("form"); setStatus(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "form" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Input via Form Manual
        </button>
        <button
          onClick={() => { setTab("excel"); setStatus(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "excel" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Import via Excel (.xlsx)
        </button>
      </div>

      {status && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ring-1 ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-rose-200"
          }`}
        >
          {status.text}
        </div>
      )}

      {tab === "form" ? (
        <form onSubmit={handleFormSubmit} className="grid gap-6 lg:grid-cols-5">
          {/* Kolom Kiri: Info Order & Pencarian Produk */}
          <div className="space-y-4 lg:col-span-3">
            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
              <h2 className="text-sm font-semibold text-slate-800">1. Informasi Transaksi Order</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">User ID</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Jeda dari Order Sebelumnya (Hari)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    placeholder="Kosongkan jika order pertama"
                    value={daysPrior}
                    onChange={(e) => setDaysPrior(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Hari Order (DOW)</label>
                  <select
                    value={orderDow}
                    onChange={(e) => setOrderDow(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Jam Order (00 - 23)</label>
                  <select
                    value={orderHour}
                    onChange={(e) => setOrderHour(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
              <h2 className="text-sm font-semibold text-slate-800">2. Cari & Pilih Produk</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={selectedDept}
                  onChange={(e) => { setSelectedDept(e.target.value); setSelectedAisle(""); }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">-- Filter Department --</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>{d.department_label}</option>
                  ))}
                </select>

                <select
                  value={selectedAisle}
                  disabled={!selectedDept}
                  onChange={(e) => setSelectedAisle(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">-- Filter Aisle --</option>
                  {filteredAisles.map((a) => (
                    <option key={a.aisle_id} value={a.aisle_id}>{a.aisle}</option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama produk atau Product ID (min. 2 huruf)..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                {loadingProducts ? (
                  <p className="p-3 text-xs text-slate-400">Mencari produk...</p>
                ) : productResults.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400">Pilih Aisle atau ketik kata kunci untuk menampilkan produk.</p>
                ) : (
                  productResults.map((p) => {
                    const added = cart.some((c) => c.product_id === p.product_id);
                    return (
                      <div key={p.product_id} className="flex items-center justify-between p-2.5 text-sm hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-800">{p.product_name}</p>
                          <p className="text-xs text-slate-400">ID: {p.product_id} · {p.department_label} › {p.aisle}</p>
                        </div>
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => addToCart(p)}
                          className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                        >
                          {added ? "Ditambahkan" : "+ Tambah"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Kolom Kanan: Daftar Keranjang Item Order */}
          <div className="lg:col-span-2">
            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">3. Daftar Item Order ({cart.length})</h2>
              </div>

              {cart.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                  Belum ada produk yang dipilih.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cart.map((item, idx) => (
                    <li key={item.product_id} className="py-2.5 flex items-start justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{idx + 1}. {item.product_name}</p>
                        <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.reordered === 1}
                            onChange={() => toggleReordered(item.product_id)}
                            className="accent-indigo-600"
                          />
                          Pernah dipesan sebelumnya (Reorder)
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan Order ke Database"}
              </button>
            </section>
          </div>
        </form>
      ) : (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Unggah File Excel (.xlsx)</h2>
              <p className="text-xs text-slate-500">
                Gunakan kolom: <code>order_group</code>, <code>user_id</code>, <code>order_dow</code> (0-6), <code>order_hour_of_day</code> (0-23), <code>days_since_prior_order</code>, <code>product_id</code>, <code>reordered</code> (0/1).
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
            >
              ↓ Download Template .xlsx
            </button>
          </div>

          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />

          {excelPreviewRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">
                Terdeteksi <b>{excelOrders.length} transaksi order</b> (menampilkan maksimal 15 baris pertama):
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {Object.keys(excelPreviewRows[0]).map((col) => (
                        <th key={col} className="px-3 py-2 font-semibold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excelPreviewRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-3 py-2 text-slate-700">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleExcelSubmit}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Mengimpor ke MySQL..." : `Import ${excelOrders.length} Order ke Database`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Tabel Riwayat 100 Data Terbaru */}
   <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
     <div className="flex items-center justify-between">
       <div>
         <h2 className="text-base font-semibold text-slate-800">
           Riwayat Transaksi Terbaru (Maks. 100 Order Terakhir)
         </h2>
         <p className="text-xs text-slate-500">
           Menampilkan data terbaru yang tersimpan di tabel <code>orders</code> & <code>order_items</code>.
         </p>
       </div>
       <button
         type="button"
         onClick={fetchRecentOrders}
         className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
       >
         Refresh Tabel
       </button>
     </div>

     <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-lg border border-slate-200">
       <table className="w-full text-left text-xs">
         <thead className="sticky top-0 bg-slate-100 text-slate-700 shadow-sm">
           <tr>
             <th className="px-3 py-2.5 font-semibold">Order ID</th>
             <th className="px-3 py-2.5 font-semibold">User ID</th>
             <th className="px-3 py-2.5 font-semibold">Order Ke-</th>
             <th className="px-3 py-2.5 font-semibold">Hari / Jam</th>
             <th className="px-3 py-2.5 font-semibold">Jeda Hari</th>
             <th className="px-3 py-2.5 font-semibold text-center">Jml Item</th>
             <th className="px-3 py-2.5 font-semibold">Daftar Produk</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
           {loadingRecent ? (
             <tr>
               <td colSpan={7} className="p-6 text-center text-slate-400">
                 Memuat data transaksi terbaru...
               </td>
             </tr>
           ) : recentOrders.length === 0 ? (
             <tr>
               <td colSpan={7} className="p-6 text-center text-slate-400">
                 Belum ada data transaksi.
               </td>
             </tr>
           ) : (
             recentOrders.map((row) => (
               <tr key={row.order_id} className="hover:bg-slate-50">
                 <td className="px-3 py-2 font-semibold text-indigo-600">#{row.order_id}</td>
                 <td className="px-3 py-2 text-slate-700">{row.user_id}</td>
                 <td className="px-3 py-2 text-slate-700">
                   {row.order_number}{" "}
                   {row.is_first_order === 1 && (
                     <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                       Baru
                     </span>
                   )}
                 </td>
                 <td className="px-3 py-2 text-slate-600">
                   {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][row.order_dow] ?? row.order_dow},{" "}
                   {String(row.order_hour_of_day).padStart(2, "0")}:00
                 </td>
                 <td className="px-3 py-2 text-slate-600">
                   {row.days_since_prior_order !== null ? `${row.days_since_prior_order} hr` : "-"}
                 </td>
                 <td className="px-3 py-2 text-center font-medium text-slate-800">{row.total_items}</td>
                 <td className="max-w-xs truncate px-3 py-2 text-slate-600" title={row.product_list}>
                   {row.product_list || "-"}
                 </td>
               </tr>
             ))
           )}
         </tbody>
       </table>
     </div>
   </section>

    </main>
  );
}