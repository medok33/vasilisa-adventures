export const SITE_SESSION_COOKIE = "vasilisa_session";
export const SITE_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function createSiteSession(secret: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + SITE_SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifySiteSession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra || !/^\d+$/.test(payload) || Number(payload) <= Math.floor(now / 1000)) return false;
  const expected = await signature(payload, secret);
  if (expected.length !== suppliedSignature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ suppliedSignature.charCodeAt(index);
  return difference === 0;
}

export async function secureTextEqual(left: string, right: string) {
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) difference |= leftDigest[index] ^ rightDigest[index];
  return difference === 0;
}

export async function secureUsernameEqual(left: string, right: string) {
  return secureTextEqual(left.toLowerCase(), right.toLowerCase());
}

export function passwordWithUppercaseFirstCharacter(value: string) {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname.startsWith("/api/auth") || url.pathname === "/login") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
