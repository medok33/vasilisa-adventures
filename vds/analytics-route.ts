import { getLearningAnalytics } from "../../../vds/learning-store";
import { cookieValue, readSiteSession, SITE_SESSION_COOKIE } from "../../../app/site-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validDay(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }

export async function GET(request: Request) {
  try {
    const secret = process.env.SITE_AUTH_SECRET;
    if (!secret) return Response.json({ error: "Авторизация сайта не настроена" }, { status: 503, headers: { "cache-control": "no-store" } });
    const session = await readSiteSession(cookieValue(request.headers.get("cookie"), SITE_SESSION_COOKIE), secret);
    if (!session) return Response.json({ error: "Требуется вход" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (session.role !== "adult") return Response.json({ error: "Доступно только взрослому аккаунту" }, { status: 403, headers: { "cache-control": "no-store" } });
    const search = new URL(request.url).searchParams;
    const period = Number(search.get("period"));
    const day = validDay(search.get("day"));
    if (!day || ![7, 14, 30].includes(period)) return Response.json({ error: "Некорректный период" }, { status: 400, headers: { "cache-control": "no-store" } });
    return Response.json(getLearningAnalytics(day, period as 7 | 14 | 30), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[analytics:get] failed", error);
    return Response.json({ error: "Не удалось собрать аналитику" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
