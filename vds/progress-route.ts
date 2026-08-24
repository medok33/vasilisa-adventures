import { promises as fs } from "node:fs";
import path from "node:path";

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
    const day = validDay(new URL(request.url).searchParams.get("day"));
    if (!day) return noStore({ error: "Некорректная дата" }, { status: 400 });
    const database = await readDatabase();
    const current = database.days[day];
    const previous = Object.entries(database.days)
      .filter(([storedDay, value]) => storedDay < day && value.closed)
      .sort(([left], [right]) => right.localeCompare(left))[0]?.[1];
    const previousPayload = previous?.payload ?? {};
    const inherited = { balance: money(previousPayload.balance), goalTitle: textValue(previousPayload.goalTitle, 80), goalAmount: money(previousPayload.goalAmount), phone: textValue(previousPayload.phone, 16) };
    if (!current) return noStore({ progress: { ...inherited, done: [] }, stars: 0, todayLimit: previous?.tomorrowLimit ?? 100, tomorrowLimit: 100, closed: false });
    return noStore({ progress: { ...inherited, ...current.payload }, stars: current.stars, todayLimit: previous?.tomorrowLimit ?? 100, tomorrowLimit: current.tomorrowLimit, closed: current.closed });
  } catch (error) {
    console.error("[progress:get] failed", error);
    return noStore({ error: "Не удалось загрузить день" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { day?: string; progress?: ProgressPayload; stars?: number; closed?: boolean };
    const day = validDay(body.day ?? null);
    if (!day) return noStore({ error: "Некорректная дата" }, { status: 400 });
    const payload = cleanPayload(body.progress ?? {});
    const stars = Math.max(0, Math.min(10, Math.round(Number(body.stars) || 0)));
    const tomorrowLimit = 100 + stars * 15;
    await updateDatabase((database) => {
      database.days[day] = { payload, stars, tomorrowLimit, closed: Boolean(body.closed), updatedAt: new Date().toISOString() };
    });
    return noStore({ ok: true, stars, tomorrowLimit, closed: Boolean(body.closed) });
  } catch (error) {
    console.error("[progress:put] failed", error);
    return noStore({ error: "Не удалось сохранить день" }, { status: 500 });
  }
}
