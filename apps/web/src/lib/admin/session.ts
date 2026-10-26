/**
 * Team-only admin access: one shared password (ADMIN_PASSWORD), and a signed
 * cookie once it's entered. Changing the password signs everyone out.
 * Replaced by real accounts when companies get their own dashboard.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { siteUrl } from "@/lib/site";
import { SESSION_COOKIE } from "./session-cookie";

const MAX_AGE_S = 60 * 60 * 24 * 14;

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

function secret(): Buffer {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  return createHash("sha256").update(`fareality-admin:${password}`).digest();
}

const sign = (expires: number) => createHmac("sha256", secret()).update(String(expires)).digest();

export function passwordMatches(input: string): boolean {
  if (!adminEnabled()) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(input), digest(process.env.ADMIN_PASSWORD!));
}

export async function startSession() {
  const expires = Date.now() + MAX_AGE_S * 1000;
  (await cookies()).set(SESSION_COOKIE, `${expires}.${sign(expires).toString("base64url")}`, {
    httpOnly: true,
    sameSite: "lax",
    // Plain-http LAN testing would never get a Secure cookie back.
    secure: siteUrl.startsWith("https://"),
    path: "/admin",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  await connection(); // the expiry check below reads the clock, so never prerender it
  const [expires, signature] = value?.split(".") ?? [];
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = sign(Number(expires));
  const given = Buffer.from(signature, "base64url");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Call at the top of every admin page and server action; proxy only does a quick check. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
