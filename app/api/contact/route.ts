export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secureUrl(value: string | undefined, allowedHosts: ReadonlySet<string>) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedHosts.has(url.hostname.toLowerCase()) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const phone = process.env.DAD_PHONE?.trim();
  const vkUrl = secureUrl(process.env.DAD_VK_URL, new Set(["vk.com", "www.vk.com", "m.vk.com"]));
  const maxUrl = secureUrl(process.env.DAD_MAX_URL, new Set(["max.ru", "www.max.ru"]));
  if (!phone || !/^\+?[0-9 ()-]{7,24}$/.test(phone) || !vkUrl || !maxUrl) {
    return Response.json({ error: "Контакты папы не настроены" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  return Response.json({ phone, vkUrl, maxUrl }, { headers: { "cache-control": "private, no-store" } });
}
