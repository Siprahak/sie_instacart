import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool, clearDashboardCache } from "@/lib/db";

interface OrderItemInput {
  product_id: number;
  reordered: number;
}

interface OrderPayload {
  user_id: number;
  order_dow: number;
  order_hour_of_day: number;
  days_since_prior_order: number | null;
  items: OrderItemInput[];
}

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        o.order_id,
        o.user_id,
        o.order_number,
        o.is_first_order,
        o.days_since_prior_order,
        o.order_dow,
        o.order_hour_of_day,
        COUNT(oi.product_id) AS total_items,
        SUM(oi.reordered) AS reordered_items,
        GROUP_CONCAT(p.product_name ORDER BY oi.add_to_cart_order SEPARATOR ', ') AS product_list
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.order_id
      LEFT JOIN products p ON p.product_id = oi.product_id
      GROUP BY o.order_id, o.user_id, o.order_number, o.is_first_order, o.days_since_prior_order, o.order_dow, o.order_hour_of_day
      ORDER BY o.order_id DESC
      LIMIT 100
    `);
    return NextResponse.json({ recent_orders: rows });
  } catch (error) {
    console.error("Fetch Recent Orders Error:", error);
    return NextResponse.json({ message: "Gagal memuat riwayat order." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    // Mendukung 1 order (dari Form) maupun array of orders (dari Excel)
    const ordersList: OrderPayload[] = Array.isArray(body.orders) ? body.orders : [body];

    if (ordersList.length === 0) {
      return NextResponse.json({ message: "Data order kosong." }, { status: 400 });
    }

    await conn.beginTransaction();

    // Ambil order_id terakhir di database
    const [maxRows] = await conn.query<RowDataPacket[]>("SELECT COALESCE(MAX(order_id), 0) AS max_id FROM orders");
    let nextOrderId = Number(maxRows[0].max_id) + 1;

    // Validasi product_id yang ada di database agar tidak kena Foreign Key Error
    const [validProdRows] = await conn.query<RowDataPacket[]>("SELECT product_id FROM products");
    const validProductIds = new Set(validProdRows.map((r) => Number(r.product_id)));

    let insertedOrders = 0;
    let insertedItems = 0;

    for (const ord of ordersList) {
      const userId = Number(ord.user_id);
      const dow = Number(ord.order_dow);
      const hour = Number(ord.order_hour_of_day);
      const daysPrior =
        ord.days_since_prior_order === null || ord.days_since_prior_order === undefined || String(ord.days_since_prior_order) === ""
          ? null
          : Number(ord.days_since_prior_order);

      if (!userId || dow < 0 || dow > 6 || hour < 0 || hour > 23) {
        throw new Error(`Data order tidak valid untuk user_id=${ord.user_id} (pastikan hari 0-6 & jam 0-23).`);
      }

      // Deduplikasi product_id dalam satu order (karena PRIMARY KEY (order_id, product_id))
      const uniqueItemsMap = new Map<number, number>();
      for (const it of ord.items ?? []) {
        const pid = Number(it.product_id);
        if (!validProductIds.has(pid)) {
          throw new Error(`Product ID ${pid} tidak ditemukan di tabel products.`);
        }
        uniqueItemsMap.set(pid, Number(it.reordered) ? 1 : 0);
      }

      if (uniqueItemsMap.size === 0) {
        throw new Error(`Order untuk user_id=${userId} harus memiliki minimal 1 produk valid.`);
      }

      // Hitung order_number & is_first_order berdasarkan riwayat user_id
      const [userHist] = await conn.query<RowDataPacket[]>(
        "SELECT COALESCE(MAX(order_number), 0) AS last_num FROM orders WHERE user_id = ?",
        [userId]
      );
      const orderNumber = Number(userHist[0].last_num) + 1;
      const isFirstOrder = orderNumber === 1 ? 1 : 0;

      // Insert ke tabel orders
      await conn.query(
        `INSERT INTO orders (order_id, user_id, eval_set, order_number, is_first_order, days_since_prior_order, order_dow, order_hour_of_day)
         VALUES (?, ?, 'prior', ?, ?, ?, ?, ?)`,
        [nextOrderId, userId, orderNumber, isFirstOrder, isFirstOrder === 1 ? null : daysPrior, dow, hour]
      );

      // Insert ke tabel order_items
      let cartOrder = 1;
      for (const [productId, reordered] of uniqueItemsMap.entries()) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, add_to_cart_order, reordered)
           VALUES (?, ?, ?, ?)`,
          [nextOrderId, productId, cartOrder++, reordered]
        );
        insertedItems++;
      }

      nextOrderId++;
      insertedOrders++;
    }

    await conn.commit();
    clearDashboardCache(); // Reset cache agar dashboard langsung ter-update

    return NextResponse.json({
      message: `Berhasil menyimpan ${insertedOrders} transaksi order (${insertedItems} total item).`,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("Insert Order Error:", error);
    return NextResponse.json(
      { message: error.message || "Gagal menyimpan data ke database." },
      { status: 400 }
    );
  } finally {
    conn.release();
  }
}