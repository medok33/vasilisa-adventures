import { cookieValue, readSiteSession, SITE_SESSION_COOKIE } from "../../site-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.SITE_AUTH_SECRET;
  if (!secret) return Response.json({ error: "Авторизация сайта не настроена" }, { status: 503, headers: { "cache-control": "no-store" } });
  const session = await readSiteSession(cookieValue(request.headers.get("cookie"), SITE_SESSION_COOKIE), secret);
  if (!session) return Response.json({ error: "Требуется вход" }, { status: 401, headers: { "cache-control": "no-store" } });
  if (session.role !== "adult") return Response.json({ error: "Доступно только взрослому аккаунту" }, { status: 403, headers: { "cache-control": "no-store" } });
  return Response.json({ error: "Analytics storage is available in the VDS build." }, { status: 501 });
}
