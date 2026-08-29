import { getOrCreateAssignments, learningDiagnostics, recordAttempts } from "../../../vds/learning-store";
import type { LearningSubject } from "../../../app/learning-system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validDay(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function noStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return Response.json(body, { ...init, headers });
}

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    if (search.get("diagnostics") === "1") return noStore(learningDiagnostics());
    const day = validDay(search.get("day"));
    if (!day) return noStore({ error: "Некорректная дата" }, { status: 400 });
    return noStore(getOrCreateAssignments(day));
  } catch (error) {
    console.error("[learning:get] failed", error);
    return noStore({ error: "Не удалось подготовить учебные задания" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      day?: string;
      subject?: LearningSubject;
      answers?: Array<{ questionId?: string; answer?: string; hintUsed?: boolean; responseMs?: number }>;
    };
    const day = validDay(body.day ?? null);
    if (!day || !["math", "english"].includes(String(body.subject))) return noStore({ error: "Некорректное задание" }, { status: 400 });
    const answers = Array.isArray(body.answers) ? body.answers.slice(0, 10).map((answer) => ({
      questionId: String(answer.questionId ?? "").slice(0, 120),
      answer: String(answer.answer ?? "").slice(0, 300),
      hintUsed: Boolean(answer.hintUsed),
      responseMs: Math.max(0, Math.min(3_600_000, Math.round(Number(answer.responseMs) || 0))),
    })) : [];
    if (!answers.length) return noStore({ error: "Нет ответов" }, { status: 400 });
    return noStore({ results: recordAttempts(day, body.subject as LearningSubject, answers) });
  } catch (error) {
    console.error("[learning:post] failed", error);
    return noStore({ error: "Не удалось сохранить попытку" }, { status: 500 });
  }
}
