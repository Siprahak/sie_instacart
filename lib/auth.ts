import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "sie-instacart-executive-secret-key-2026";
export const COOKIE_NAME = "sie_session";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function createSessionToken(payload: { id: number; username: string; full_name: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifySessionToken(token?: string): { id: number; username: string; full_name: string } | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expectedSig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  if (signature !== expectedSig) return null;

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}