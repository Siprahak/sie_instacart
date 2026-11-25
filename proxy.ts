import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1. Tangani proses Logout langsung di proxy agar cookie sie_session terhapus bersih
  if (pathname === "/login" && searchParams.get("logout") === "1") {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("sie_session");
    res.cookies.set("sie_session", "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
    return res;
  }

  const session = req.cookies.get("sie_session")?.value;

  // 2. IZINKAN FILE LOGO & GAMBAR: Agar gambar di folder public/ bisa tampil di halaman /login
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 3. Jika belum login dan mencoba buka halaman internal atau API
  if (!session && pathname !== "/login") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 4. Jika sudah login tapi membuka halaman /login, lempar kembali ke Main Menu
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)"],
};