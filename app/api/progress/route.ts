import { env } from "cloudflare:workers";
import { cleanRanges, getBook, mergeRanges, type ReadingRange } from "../../books";

type ProgressPayload = Record<string, unknown>;

function validDay(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }
function strings(value: unknown, max: number) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 200)).slice(0, max) : []; }
function textValue(value: unknown, max: number) { return typeof value === "string" ? value.slice(0, max) : ""; }
function money(value: unknown) { return Math.max(0, Math.min(1_000_000, Math.round(Number(value) || 0))); }
function readingFields(input: ProgressPayload) {
  const book = getBook(input.readingBook);
  return { readingBook: book.id, readingRanges: cleanRanges(input.readingRanges, book) };
}
function rangesFromPayloads(payloads: ProgressPayload[]) {
  const first = payloads.find((payload) => typeof payload.readingBook === "string") ?? {};
  const book = getBook(first.readingBook);
  return { book, ranges: payloads.reduce<ReadingRange[]>((ranges, payload) => mergeRanges(ranges, cleanRanges(payload.readingRanges, book), book), []) };
}

function cleanPayload(input: ProgressPayload) {
  return {
    done: strings(input.done, 10), morningChecks: strings(input.morningChecks, 10), orderChecks: strings(input.orderChecks, 10),
    readingStart: textValue(input.readingStart, 4), readingEnd: textValue(input.readingEnd, 4),
    ...readingFields(input),
    readingMinutes: Math.max(15, Math.min(30, Number(input.readingMinutes) || 15)), readingAnswer: textValue(input.readingAnswer, 500),
    mathAnswers: strings(input.mathAnswers, 5), englishAnswers: strings(input.englishAnswers, 6),
    kindnessChoice: textValue(input.kindnessChoice, 200), kindnessNote: textValue(input.kindnessNote, 400), independenceChoice: textValue(input.independenceChoice, 200),
    mood: textValue(input.mood, 8), goodThing: textValue(input.goodThing, 500), hardThing: textValue(input.hardThing, 500), dadNote: textValue(input.dadNote, 600), dadNotifiedText: textValue(input.dadNotifiedText, 600), dadNotifiedAt: textValue(input.dadNotifiedAt, 40),
    balance: money(input.balance), goalTitle: textValue(input.goalTitle, 80), goalAmount: money(input.goalAmount), phone: textValue(input.phone, 16), reserveStar: Boolean(input.reserveStar), decision: textValue(input.decision, 12),
    savingsTransfer: Math.floor(money(input.savingsTransfer) / 10) * 10, savingsApplied: Boolean(input.savingsApplied),
    motherSignature: textValue(input.motherSignature, 200_000), signedAt: textValue(input.signedAt, 40),
  };
}

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    if (search.get("history") === "1") {
      const rows = await env.DB.prepare("SELECT day, payload, stars, tomorrow_limit, closed FROM daily_progress ORDER BY day DESC LIMIT 60").all<{ day: string; payload: string; stars: number; tomorrow_limit: number; closed: number }>();
      return Response.json({ days: rows.results.map((row) => ({ day: row.day, progress: JSON.parse(row.payload), stars: row.stars, tomorrowLimit: row.tomorrow_limit, closed: Boolean(row.closed) })) });
    }
    const day = validDay(search.get("day"));
    if (!day) return Response.json({ error: "Некорректная дата" }, { status: 400 });
    const current = await env.DB.prepare("SELECT payload, stars, tomorrow_limit, closed FROM daily_progress WHERE day = ?").bind(day).first<{ payload: string; stars: number; tomorrow_limit: number; closed: number }>();
    const previous = await env.DB.prepare("SELECT payload, tomorrow_limit FROM daily_progress WHERE day < ? AND closed = 1 ORDER BY day DESC LIMIT 1").bind(day).first<{ payload: string; tomorrow_limit: number }>();
    const previousPayload = previous ? JSON.parse(previous.payload) as ProgressPayload : {};
    const readingRows = await env.DB.prepare("SELECT payload FROM daily_progress WHERE day < ? ORDER BY day ASC").bind(day).all<{ payload: string }>();
    const reading = rangesFromPayloads(readingRows.results.map((row) => JSON.parse(row.payload) as ProgressPayload));
    const inherited = { balance: money(previousPayload.balance), goalTitle: textValue(previousPayload.goalTitle, 80), goalAmount: money(previousPayload.goalAmount), phone: textValue(previousPayload.phone, 16), readingBook: reading.book.id, readingRanges: reading.ranges };
    if (!current) return Response.json({ progress: { ...inherited, done: [] }, stars: 0, todayLimit: previous?.tomorrow_limit ?? 100, tomorrowLimit: 100, closed: false });
    return Response.json({ progress: { ...inherited, ...JSON.parse(current.payload) }, stars: current.stars, todayLimit: previous?.tomorrow_limit ?? 100, tomorrowLimit: current.tomorrow_limit, closed: Boolean(current.closed) });
  } catch (error) {
    console.error("[progress:get] failed", error);
    return Response.json({ error: "Не удалось загрузить день" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { day?: string; note?: string };
    const day = validDay(body.day ?? null);
    const note = textValue(body.note, 600).trim();
    if (!day || !note) return Response.json({ error: "Пустое сообщение" }, { status: 400 });
    const bindings = env as unknown as { VK_BOT_TOKEN?: string; VK_DAD_PEER_ID?: string };
    if (!bindings.VK_BOT_TOKEN || !bindings.VK_DAD_PEER_ID) return Response.json({ accepted: true, delivered: false, channel: "not_configured" }, { status: 202 });
    const params = new URLSearchParams({ access_token: bindings.VK_BOT_TOKEN, v: "5.199", peer_id: bindings.VK_DAD_PEER_ID, random_id: String(Date.now()), message: `Василиса поделилась записью за ${day}:\n\n${note}` });
    const response = await fetch("https://api.vk.com/method/messages.send", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params });
    const result = await response.json() as { error?: unknown };
    if (!response.ok || result.error) throw new Error("vk");
    return Response.json({ delivered: true, channel: "vk" });
  } catch (error) {
    console.error("[progress:notify] failed", error);
    return Response.json({ error: "Не удалось отправить уведомление" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { day?: string; progress?: ProgressPayload; stars?: number; closed?: boolean };
    const day = validDay(body.day ?? null);
    if (!day) return Response.json({ error: "Некорректная дата" }, { status: 400 });
    const progress = cleanPayload(body.progress ?? {});
    const readingRows = await env.DB.prepare("SELECT payload FROM daily_progress WHERE day < ? ORDER BY day ASC").bind(day).all<{ payload: string }>();
    const historicReading = rangesFromPayloads(readingRows.results.map((row) => JSON.parse(row.payload) as ProgressPayload));
    const book = getBook(progress.readingBook);
    if (book.id !== historicReading.book.id && historicReading.ranges.length > 0) return Response.json({ error: "Следующая книга откроется после завершения текущей." }, { status: 400 });
    progress.readingBook = book.id;
    progress.readingRanges = mergeRanges(historicReading.ranges, progress.readingRanges as ReadingRange[], book);
    const stars = Math.max(0, Math.min(10, Math.round(Number(body.stars) || 0)));
    const savingsTransfer = Math.min(Math.floor(stars * 15 / 10) * 10, Number(progress.savingsTransfer) || 0);
    const tomorrowLimit = 100 + stars * 15 - savingsTransfer;
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
