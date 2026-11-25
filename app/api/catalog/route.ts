import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const aisleId = searchParams.get("aisle_id");

    // Jika ada pencarian produk atau filter aisle
    if (q || aisleId) {
      let sql = `
        SELECT p.product_id, p.product_name, a.aisle, d.department_label
        FROM products p
        JOIN aisles a ON a.aisle_id = p.aisle_id
        JOIN departments d ON d.department_id = a.department_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (aisleId) {
        sql += " AND p.aisle_id = ?";
        params.push(Number(aisleId));
      }
      if (q) {
        sql += " AND (p.product_name LIKE ? OR p.product_id = ?)";
        params.push(`%${q}%`, Number(q) || -1);
      }

      sql += " ORDER BY p.product_name ASC LIMIT 50";
      const [products] = await pool.query<RowDataPacket[]>(sql, params);
      return NextResponse.json({ products });
    }

    // Default: kembalikan daftar departments & aisles untuk cascading dropdown
    const [departments] = await pool.query<RowDataPacket[]>(
      "SELECT department_id, department_label FROM departments ORDER BY department_label ASC"
    );
    const [aisles] = await pool.query<RowDataPacket[]>(
      "SELECT aisle_id, aisle, department_id FROM aisles ORDER BY aisle ASC"
    );

    return NextResponse.json({ departments, aisles });
  } catch (error) {
    console.error("Catalog Error:", error);
    return NextResponse.json({ message: "Gagal memuat katalog produk." }, { status: 500 });
  }
}