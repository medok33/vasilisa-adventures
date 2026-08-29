import { promises as fs } from "node:fs";
import path from "node:path";
import { getBook, readingStarCount } from "../../books";
import { completeLearningDay } from "../../../vds/learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProgressPayload = Record<string, unknown>;
type StoredDay = {
  payload: ProgressPayload;
  stars: number;
  tomorrowLimit: number;
  closed: boolean;
  updatedAt: string;
};
type Database = { days: Record<string, StoredDay> };

const dataDir = process.env.DATA_DIR || "/data";
const dataFile = path.join(dataDir, "progress.json");
let writeQueue: Promise<void> = Promise.resolve();

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
function booleanRecord(value: unknown) { return value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 100).map(([key, item]) => [key.slice(0, 120), Boolean(item)])) : {}; }
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
        hintUsed: Boolean(attempt.hintUsed),
        responseMs: Math.max(0, Math.min(3_600_000, Math.round(Number(attempt.responseMs) || 0))),
      }));
      return [questionId, {
        questionId,
        prompt: textValue(question.prompt, 300),
        expectedAnswer: textValue(question.expectedAnswer, 200),
        subject,
        skill: textValue(question.skill, 80) || "general",
        topic: textValue(question.topic, 80) || textValue(question.skill, 80) || "general",
        level: Math.max(0, Math.min(4, Math.round(Number(question.level) || 1))),
        role: ["current", "reinforcement", "stretch", "legacy"].includes(String(question.role)) ? question.role : "legacy",
        templateId: textValue(question.templateId, 100) || "legacy",
        attempts,
      }];
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
    readingMinutes: Math.max(15, Math.min(30, Number(input.readingMinutes) || 15)), readingAnswer: textValue(input.readingAnswer, 500),
    ...inheritedReading(input), mathAnswers: strings(input.mathAnswers, 5), mathAttempts: Math.max(0, Math.min(99, Math.round(Number(input.mathAttempts) || 0))), englishAnswers: strings(input.englishAnswers, 6), englishAttempts: Math.max(0, Math.min(99, Math.round(Number(input.englishAttempts) || 0))), learningHistory: cleanLearningHistory(input.learningHistory), learningHints: booleanRecord(input.learningHints),
    kindnessChoice: textValue(input.kindnessChoice, 200), kindnessNote: textValue(input.kindnessNote, 400), independenceChoice: textValue(input.independenceChoice, 200), independenceNote: textValue(input.independenceNote, 400),
    mood: textValue(input.mood, 8), goodThing: textValue(input.goodThing, 500), hardThing: textValue(input.hardThing, 500), dadNote: textValue(input.dadNote, 600), dadNotifiedText: textValue(input.dadNotifiedText, 600), dadNotifiedAt: textValue(input.dadNotifiedAt, 40),
    balance: money(input.balance), goalTitle: textValue(input.goalTitle, 80), goalAmount: money(input.goalAmount), reserveStar: Boolean(input.reserveStar), decision: textValue(input.decision, 12),
    savingsTransfer: Math.floor(money(input.savingsTransfer) / 10) * 10, savingsApplied: Boolean(input.savingsApplied),
    motherSignature: textValue(input.motherSignature, 200_000), signedAt: textValue(input.signedAt, 40),
  };
}

async function readDatabase(): Promise<Database> {
  await writeQueue;
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8")) as Database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { days: {} };
    throw error;
  }
}

async function updateDatabase(update: (database: Database) => void) {
  const operation = writeQueue.then(async () => {
    await fs.mkdir(dataDir, { recursive: true });
    let database: Database;
    try {
      database = JSON.parse(await fs.readFile(dataFile, "utf8")) as Database;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      database = { days: {} };
    }
    update(database);
    const temporaryFile = `${dataFile}.${process.pid}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(database, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(temporaryFile, dataFile);
  });
  writeQueue = operation.catch(() => undefined);
  await operation;
}

function noStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return Response.json(body, { ...init, headers });
}

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    if (search.get("history") === "1") {
      const database = await readDatabase();
      const days = Object.entries(database.days).sort(([left], [right]) => right.localeCompare(left)).slice(0, 60).map(([storedDay, value]) => ({ day: storedDay, progress: value.payload, stars: value.stars, tomorrowLimit: value.tomorrowLimit, closed: value.closed }));
      return noStore({ days });
    }
    const day = validDay(search.get("day"));
    if (!day) return noStore({ error: "Некорректная дата" }, { status: 400 });
    const database = await readDatabase();
    const current = database.days[day];
    const previous = Object.entries(database.days)
      .filter(([storedDay, value]) => storedDay < day && value.closed)
      .sort(([left], [right]) => right.localeCompare(left))[0]?.[1];
    const previousPayload = previous?.payload ?? {};
    const latestPayload = Object.entries(database.days).filter(([storedDay]) => storedDay < day).sort(([left], [right]) => right.localeCompare(left))[0]?.[1].payload ?? previousPayload;
    const inherited = { balance: money(previousPayload.balance), goalTitle: textValue(previousPayload.goalTitle, 80), goalAmount: money(previousPayload.goalAmount), ...inheritedReading(latestPayload) };
    if (!current) return noStore({ progress: { ...inherited, done: [] }, stars: 0, todayLimit: previous?.tomorrowLimit ?? 100, tomorrowLimit: 100, closed: false });
    return noStore({ progress: { ...inherited, ...current.payload }, stars: current.stars, todayLimit: previous?.tomorrowLimit ?? 100, tomorrowLimit: current.tomorrowLimit, closed: current.closed });
  } catch (error) {
    console.error("[progress:get] failed", error);
    return noStore({ error: "Не удалось загрузить день" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { day?: string; note?: string };
    const day = validDay(body.day ?? null);
    const note = textValue(body.note, 600).trim();
    if (!day || !note) return noStore({ error: "Пустое сообщение" }, { status: 400 });
    const token = process.env.VK_BOT_TOKEN;
    const peerId = process.env.VK_DAD_PEER_ID;
    if (!token || !peerId) return noStore({ accepted: true, delivered: false, channel: "not_configured" }, { status: 202 });
    const params = new URLSearchParams({ access_token: token, v: "5.199", peer_id: peerId, random_id: String(Date.now()), message: `Василиса поделилась записью за ${day}:\n\n${note}` });
    const response = await fetch("https://api.vk.com/method/messages.send", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params });
    const result = await response.json() as { error?: unknown };
    if (!response.ok || result.error) throw new Error("vk");
    return noStore({ delivered: true, channel: "vk" });
  } catch (error) {
    console.error("[progress:notify] failed", error);
    return noStore({ error: "Не удалось отправить уведомление" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { day?: string; progress?: ProgressPayload; stars?: number; closed?: boolean };
    const day = validDay(body.day ?? null);
    if (!day) return noStore({ error: "Некорректная дата" }, { status: 400 });
    const payload = cleanPayload(body.progress ?? {});
    const fixedStars = payload.done.reduce((sum, id) => sum + (id === "math" ? 2 : id === "reading" ? 0 : 1), 0);
    const readingStars = readingStarCount(getBook(payload.readingBook), payload.readingQuestionAnswers, payload.readingMinutes, payload.done.includes("reading"));
    const reserveStar = payload.reserveStar && fixedStars + readingStars === 9 ? 1 : 0;
    const stars = Math.min(10, fixedStars + readingStars + reserveStar);
    const savingsTransfer = Math.min(Math.floor(stars * 15 / 10) * 10, Number(payload.savingsTransfer) || 0);
    const tomorrowLimit = 100 + stars * 15 - savingsTransfer;
    await updateDatabase((database) => {
      database.days[day] = { payload, stars, tomorrowLimit, closed: Boolean(body.closed), updatedAt: new Date().toISOString() };
    });
    if (body.closed) {
      const done = Array.isArray(payload.done) ? payload.done : [];
      completeLearningDay(day, (["math", "english"] as const).filter((subject) => done.includes(subject)));
    }
    return noStore({ ok: true, stars, tomorrowLimit, closed: Boolean(body.closed) });
  } catch (error) {
    console.error("[progress:put] failed", error);
    return noStore({ error: "Не удалось сохранить день" }, { status: 500 });
  }
}
