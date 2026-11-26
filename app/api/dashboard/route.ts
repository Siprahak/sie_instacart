import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Dashboard Error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}