import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ message: "Berhasil keluar" });

  // Ambil SEMUA cookie yang tersimpan di browser saat ini dan hapus semuanya
  const allCookies = req.cookies.getAll();
  for (const cookie of allCookies) {
    res.cookies.set(cookie.name, "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
    // Hapus juga tanpa httpOnly untuk berjaga-jaga
    res.cookies.delete(cookie.name);
  }

  return res;
}