import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "league_admin";

/** The admin password. Set ADMIN_PASSWORD in Vercel; locally it defaults to "dev". */
function adminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  return process.env.NODE_ENV === "production" ? null : "dev";
}

function token(pw: string) {
  return createHash("sha256").update(`2hg-league:${pw}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function adminConfigured() {
  return adminPassword() !== null;
}

export async function isAdmin(): Promise<boolean> {
  const pw = adminPassword();
  if (!pw) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, token(pw));
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in as admin.");
}

export async function signIn(password: string): Promise<boolean> {
  const pw = adminPassword();
  if (!pw || !safeEqual(password, pw)) return false;
  (await cookies()).set(COOKIE, token(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
