import { env } from "cloudflare:workers";
import { getBook, readingStarCount } from "../../books";

type ProgressPayload = Record<string, unknown>;

function validDay(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }
function strings(value: unknown, max: number) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 200)).slice(0, max) : []; }
function textValue(value: unknown, max: number) { return typeof value === "string" ? value.slice(0, max) : ""; }
function money(value: unknown) { return Math.max(0, Math.min(1_000_000, Math.round(Number(value) || 0))); }
const bookLimits = { emerald: [5, 288], urfin: [5, 248], pippi: [5, 125] } as const;
function cleanBookProgress(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(bookLimits).map(([id, limits]) => {
    const ranges = Array.isArray(source[id]) ? source[id] as Array<Record<string, unknown>> : [];
    return [id, ranges.map((range) => ({ from: Math.max(limits[0], Math.round(Number(range.from))), to: Math.min(limits[1], Math.round(Number(range.to))) })).filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to) && range.from <= range.to).slice(0, 100)];
  }));
}
function textRecord(value: unknown) { return value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 100).map(([key, item]) => [key.slice(0, 40), textValue(item, 800)])) : {}; }
function cleanLearningHistory(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries((["math", "english"] as const).map((subject) => {
    const questions = source[subject] && typeof source[subject] === "object" ? source[subject] as Record<string, unknown> : {};
    const cleaned = Object.entries(questions).slice(0, 20).map(([key, item]) => {
      const question = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const questionId = textValue(question.questionId, 80) || key.slice(0, 80);
      const rawAttempts = Array.isArray(question.attempts) ? question.attempts as Array<Record<string, unknown>> : [];
      const attempts = rawAttempts.slice(0, 99).map((attempt, index) => ({
        number: index + 1,
        answer: textValue(attempt.answer, 200),
        correct: Boolean(attempt.correct),
        checkedAt: textValue(attempt.checkedAt, 40),
      }));
      return [questionId, { questionId, prompt: textValue(question.prompt, 300), expectedAnswer: textValue(question.expectedAnswer, 200), attempts }];
    });
    return [subject, Object.fromEntries(cleaned)];
  }));
}
function inheritedReading(payload: ProgressPayload) {
  const bookProgress = cleanBookProgress(payload.bookProgress);
  const legacyFrom = Number(payload.readingStart); const legacyTo = Number(payload.readingEnd);
  if (!bookProgress.emerald.length && Number.isFinite(legacyFrom) && Number.isFinite(legacyTo) && legacyFrom <= legacyTo) bookProgress.emerald = [{ from: 5, to: Math.min(288, legacyTo) }];
  return { readingBook: ["emerald", "urfin", "pippi"].includes(String(payload.readingBook)) ? payload.readingBook : "emerald", bookProgress, readingQuestionAnswers: textRecord(payload.readingQuestionAnswers) };
}

function cleanPayload(input: ProgressPayload) {
  return {
    done: strings(input.done, 10), morningChecks: strings(input.morningChecks, 10), orderChecks: strings(input.orderChecks, 10),
    readingStart: textValue(input.readingStart, 4), readingEnd: textValue(input.readingEnd, 4),
    readingMinutes: Math.max(15, Math.min(30, Number(input.readingMinutes) || 15)), readingAnswer: textValue(input.readingAnswer, 500), ...inheritedReading(input),
    mathAnswers: strings(input.mathAnswers, 5), mathAttempts: Math.max(0, Math.min(99, Math.round(Number(input.mathAttempts) || 0))), englishAnswers: strings(input.englishAnswers, 6), englishAttempts: Math.max(0, Math.min(99, Math.round(Number(input.englishAttempts) || 0))), learningHistory: cleanLearningHistory(input.learningHistory),
    kindnessChoice: textValue(input.kindnessChoice, 200), kindnessNote: textValue(input.kindnessNote, 400), independenceChoice: textValue(input.independenceChoice, 200), independenceNote: textValue(input.independenceNote, 400),
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
    const latest = await env.DB.prepare("SELECT payload FROM daily_progress WHERE day < ? ORDER BY day DESC LIMIT 1").bind(day).first<{ payload: string }>();
    const previousPayload = previous ? JSON.parse(previous.payload) as ProgressPayload : {};
    const inherited = { balance: money(previousPayload.balance), goalTitle: textValue(previousPayload.goalTitle, 80), goalAmount: money(previousPayload.goalAmount), phone: textValue(previousPayload.phone, 16), ...inheritedReading(latest ? JSON.parse(latest.payload) as ProgressPayload : previousPayload) };
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
    const fixedStars = progress.done.reduce((sum, id) => sum + (id === "math" ? 2 : id === "reading" ? 0 : 1), 0);
    const readingStars = readingStarCount(getBook(progress.readingBook), progress.readingQuestionAnswers, progress.readingMinutes, progress.done.includes("reading"));
    const reserveStar = progress.reserveStar && fixedStars + readingStars === 9 ? 1 : 0;
    const stars = Math.min(10, fixedStars + readingStars + reserveStar);
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
