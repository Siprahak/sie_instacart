import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { COOKIE_NAME, createSessionToken, hashPassword } from "@/lib/auth";

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username dan password wajib diisi." }, { status: 400 });
    }

    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, username, password_hash, full_name FROM users WHERE username = ? LIMIT 1",
      [username.trim()]
    );

    const user = rows[0];
    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json({ message: "Username atau password salah." }, { status: 401 });
    }

    const token = createSessionToken({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
    });

    const res = NextResponse.json({
      message: "Login berhasil",
      user: { username: user.username, full_name: user.full_name },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // Berlaku 8 jam
    });

    return res;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan koneksi ke database." }, { status: 500 });
  }
}