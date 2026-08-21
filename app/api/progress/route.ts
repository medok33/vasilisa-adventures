import { env } from "cloudflare:workers";

type ProgressPayload = Record<string, unknown>;

function validDay(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }
function strings(value: unknown, max: number) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 200)).slice(0, max) : []; }
function textValue(value: unknown, max: number) { return typeof value === "string" ? value.slice(0, max) : ""; }
function money(value: unknown) { return Math.max(0, Math.min(1_000_000, Math.round(Number(value) || 0))); }

function cleanPayload(input: ProgressPayload) {
  return {
    done: strings(input.done, 10), morningChecks: strings(input.morningChecks, 10), orderChecks: strings(input.orderChecks, 10),
    readingStart: textValue(input.readingStart, 4), readingEnd: textValue(input.readingEnd, 4),
    readingMinutes: Math.max(15, Math.min(30, Number(input.readingMinutes) || 15)), readingAnswer: textValue(input.readingAnswer, 500),
    mathAnswers: strings(input.mathAnswers, 5), englishAnswers: strings(input.englishAnswers, 6),
    kindnessChoice: textValue(input.kindnessChoice, 200), kindnessNote: textValue(input.kindnessNote, 400), independenceChoice: textValue(input.independenceChoice, 200),
    mood: textValue(input.mood, 8), goodThing: textValue(input.goodThing, 500), hardThing: textValue(input.hardThing, 500), dadNote: textValue(input.dadNote, 600),
    balance: money(input.balance), goalTitle: textValue(input.goalTitle, 80), goalAmount: money(input.goalAmount), phone: textValue(input.phone, 16), reserveStar: Boolean(input.reserveStar), decision: textValue(input.decision, 12),
  };
}

export async function GET(request: Request) {
  try {
    const day = validDay(new URL(request.url).searchParams.get("day"));
    if (!day) return Response.json({ error: "Некорректная дата" }, { status: 400 });
    const current = await env.DB.prepare("SELECT payload, stars, tomorrow_limit, closed FROM daily_progress WHERE day = ?").bind(day).first<{ payload: string; stars: number; tomorrow_limit: number; closed: number }>();
    const previous = await env.DB.prepare("SELECT payload, tomorrow_limit FROM daily_progress WHERE day < ? AND closed = 1 ORDER BY day DESC LIMIT 1").bind(day).first<{ payload: string; tomorrow_limit: number }>();
    const previousPayload = previous ? JSON.parse(previous.payload) as ProgressPayload : {};
    const inherited = { balance: money(previousPayload.balance), goalTitle: textValue(previousPayload.goalTitle, 80), goalAmount: money(previousPayload.goalAmount), phone: textValue(previousPayload.phone, 16) };
    if (!current) return Response.json({ progress: { ...inherited, done: [] }, stars: 0, todayLimit: previous?.tomorrow_limit ?? 100, tomorrowLimit: 100, closed: false });
    return Response.json({ progress: { ...inherited, ...JSON.parse(current.payload) }, stars: current.stars, todayLimit: previous?.tomorrow_limit ?? 100, tomorrowLimit: current.tomorrow_limit, closed: Boolean(current.closed) });
  } catch (error) {
    console.error("[progress:get] failed", error);
    return Response.json({ error: "Не удалось загрузить день" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { day?: string; progress?: ProgressPayload; stars?: number; closed?: boolean };
    const day = validDay(body.day ?? null);
    if (!day) return Response.json({ error: "Некорректная дата" }, { status: 400 });
    const progress = cleanPayload(body.progress ?? {});
    const stars = Math.max(0, Math.min(10, Math.round(Number(body.stars) || 0)));
    const tomorrowLimit = 100 + stars * 15;
    await env.DB.prepare(`INSERT INTO daily_progress (day, payload, stars, tomorrow_limit, closed, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(day) DO UPDATE SET payload = excluded.payload, stars = excluded.stars,
      tomorrow_limit = excluded.tomorrow_limit, closed = excluded.closed, updated_at = CURRENT_TIMESTAMP`)
      .bind(day, JSON.stringify(progress), stars, tomorrowLimit, body.closed ? 1 : 0).run();
    return Response.json({ ok: true, stars, tomorrowLimit, closed: Boolean(body.closed) });
  } catch (error) {
    console.error("[progress:put] failed", error);
    return Response.json({ error: "Не удалось сохранить день" }, { status: 500 });
  }
}
