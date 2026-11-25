import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}