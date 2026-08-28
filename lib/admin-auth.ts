import { env } from "cloudflare:workers";

type AdminEnv = {
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
};

const encoder = new TextEncoder();

function config() {
  return env as unknown as AdminEnv;
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function sign(value: string) {
  const secret = config().ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64(new Uint8Array(signature)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function cookieValue(request: Request, key: string) {
  const pair = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${key}=`));
  return pair?.slice(key.length + 1) ?? "";
}

export function hasAdminConfiguration() {
  return Boolean(config().ADMIN_PASSWORD && config().ADMIN_SESSION_SECRET);
}

export async function createAdminCookie() {
  const expires = Date.now() + 1000 * 60 * 60 * 8;
  const value = `admin.${expires}`;
  const signature = await sign(value);
  if (!signature) return null;
  return `${value}.${signature}`;
}

export async function isAdmin(request: Request) {
  const token = cookieValue(request, "rouw_admin");
  const [role, expires, signature] = token.split(".");
  if (role !== "admin" || !expires || !signature || Number(expires) < Date.now()) return false;
  const value = `${role}.${expires}`;
  const expected = await sign(value);
  return Boolean(expected && expected === signature);
}

export function passwordMatches(password: string) {
  const expected = config().ADMIN_PASSWORD;
  return Boolean(expected && password && expected === password);
}

export const adminCookie = (value: string) => `rouw_admin=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
export const clearedAdminCookie = "rouw_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
