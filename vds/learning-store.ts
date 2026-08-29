import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  SUBJECT_SKILLS,
  addDays,
  decideSkillAdaptation,
  generateDailyAssignments,
  isAnswerCorrect,
  type LearningQuestion,
  type LearningSubject,
  type SkillState,
} from "../app/learning-system.ts";

const dataDir = process.env.DATA_DIR || "/data";
const databaseFile = path.join(dataDir, "learning.sqlite");
let database: DatabaseSync | null = null;
let legacyMigrationDone = false;

type AssignmentRow = {
  assignment_id: string;
  day: string;
  subject: LearningSubject;
  position: number;
  role: "current" | "reinforcement" | "stretch" | "legacy";
  item_id: string;
  skill: string;
  topic: string;
  template_id: string;
  level: number;
  prompt: string;
  expected_answer: string;
  kind: "input" | "choice";
  options_json: string;
  hint: string;
  icon: string;
  fingerprint: string;
};

function db() {
  if (database) return database;
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  database = new DatabaseSync(databaseFile);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS learning_items (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL CHECK(subject IN ('math','english')),
      skill TEXT NOT NULL,
      topic TEXT NOT NULL,
      template_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      expected_answer TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('input','choice')),
      options_json TEXT NOT NULL DEFAULT '[]',
      hint TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      fingerprint TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS daily_assignments (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      subject TEXT NOT NULL CHECK(subject IN ('math','english')),
      position INTEGER NOT NULL,
      item_id TEXT NOT NULL REFERENCES learning_items(id),
      role TEXT NOT NULL CHECK(role IN ('current','reinforcement','stretch','legacy')),
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(day, subject, position)
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id TEXT NOT NULL REFERENCES daily_assignments(id),
      attempt_number INTEGER NOT NULL,
      answer TEXT NOT NULL,
      correct INTEGER NOT NULL,
      hint_used INTEGER NOT NULL DEFAULT 0,
      response_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(assignment_id, attempt_number)
    );
    CREATE TABLE IF NOT EXISTS skill_progress (
      subject TEXT NOT NULL,
      skill TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      state TEXT NOT NULL DEFAULT 'collecting',
      first_attempt_correct INTEGER NOT NULL DEFAULT 0,
      first_attempt_total INTEGER NOT NULL DEFAULT 0,
      accuracy REAL NOT NULL DEFAULT 0,
      review_due_json TEXT NOT NULL DEFAULT '[]',
      last_evaluated_day TEXT NOT NULL DEFAULT '',
      last_changed_on TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(subject, skill)
    );
    CREATE TABLE IF NOT EXISTS adaptation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      subject TEXT NOT NULL,
      skill TEXT NOT NULL,
      old_level INTEGER NOT NULL,
      new_level INTEGER NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS learning_days (
      day TEXT PRIMARY KEY,
      math_completed INTEGER NOT NULL DEFAULT 0,
      english_completed INTEGER NOT NULL DEFAULT 0,
      closed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS daily_assignments_day_idx ON daily_assignments(day, subject);
    CREATE INDEX IF NOT EXISTS attempts_assignment_idx ON attempts(assignment_id, attempt_number);
    CREATE INDEX IF NOT EXISTS learning_items_skill_idx ON learning_items(subject, skill);
  `);
  try { chmodSync(databaseFile, 0o600); } catch { /* Docker volume permissions are enforced separately. */ }
  migrateLegacyProgress(database);
  return database;
}

function transaction<T>(database: DatabaseSync, operation: () => T) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function migrateLegacyProgress(database: DatabaseSync) {
  if (legacyMigrationDone) return;
  legacyMigrationDone = true;
  const migrated = database.prepare("SELECT value FROM learning_meta WHERE key = ?").get("progress_json_v1") as { value?: string } | undefined;
  if (migrated) return;
  const progressFile = path.join(dataDir, "progress.json");
  if (!existsSync(progressFile)) {
    database.prepare("INSERT OR REPLACE INTO learning_meta(key,value) VALUES(?,?)").run("progress_json_v1", new Date().toISOString());
    return;
  }
  try {
    const source = JSON.parse(readFileSync(progressFile, "utf8")) as { days?: Record<string, { payload?: Record<string, unknown> }> };
    transaction(database, () => {
      for (const [day, stored] of Object.entries(source.days ?? {})) {
        const history = (stored.payload?.learningHistory ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
        for (const subject of ["math", "english"] as const) {
          let position = 0;
          for (const [questionKey, rawQuestion] of Object.entries(history[subject] ?? {})) {
            const prompt = String(rawQuestion.prompt ?? "").slice(0, 500);
            const expectedAnswer = String(rawQuestion.expectedAnswer ?? "").slice(0, 300);
            const skill = String(rawQuestion.skill ?? rawQuestion.topic ?? "general").slice(0, 80);
            const itemId = `legacy-${stableId(`${day}:${subject}:${questionKey}`)}`;
            const fingerprint = `legacy|${day}|${subject}|${questionKey}|${prompt}|${expectedAnswer}`.toLowerCase();
            database.prepare(`INSERT OR IGNORE INTO learning_items
              (id,subject,skill,topic,template_id,level,prompt,expected_answer,kind,options_json,hint,icon,fingerprint)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(itemId, subject, skill, skill, "legacy", Number(rawQuestion.level) || 1, prompt, expectedAnswer, "input", "[]", "", "", fingerprint);
            const assignmentId = `legacy-${stableId(`${day}:${subject}:${questionKey}:assignment`)}`;
            database.prepare(`INSERT OR IGNORE INTO daily_assignments(id,day,subject,position,item_id,role)
              VALUES(?,?,?,?,?,?)`).run(assignmentId, day, subject, position, itemId, "legacy");
            const attempts = Array.isArray(rawQuestion.attempts) ? rawQuestion.attempts as Array<Record<string, unknown>> : [];
            attempts.forEach((attempt, index) => {
              database.prepare(`INSERT OR IGNORE INTO attempts
                (assignment_id,attempt_number,answer,correct,hint_used,response_ms,created_at)
                VALUES(?,?,?,?,?,?,?)`).run(assignmentId, index + 1, String(attempt.answer ?? "").slice(0, 300), attempt.correct ? 1 : 0, attempt.hintUsed ? 1 : 0, Math.max(0, Number(attempt.responseMs) || 0), String(attempt.checkedAt ?? new Date().toISOString()).slice(0, 40));
            });
            position += 1;
          }
        }
      }
      database.prepare("INSERT OR REPLACE INTO learning_meta(key,value) VALUES(?,?)").run("progress_json_v1", new Date().toISOString());
    });
  } catch (error) {
    console.error("[learning:migrate] legacy progress import failed", error);
  }
}

function currentSkillStates(database: DatabaseSync): SkillState[] {
  const rows = database.prepare("SELECT subject,skill,level,state,review_due_json FROM skill_progress").all() as Array<{ subject: LearningSubject; skill: string; level: number; state: SkillState["state"]; review_due_json: string }>;
  return rows.map((row) => ({ subject: row.subject, skill: row.skill as SkillState["skill"], level: row.level, state: row.state, reviewDueDates: JSON.parse(row.review_due_json || "[]") }));
}

function assignmentRows(database: DatabaseSync, day: string) {
  return database.prepare(`SELECT a.id AS assignment_id,a.day,a.subject,a.position,a.role,a.item_id,
    i.skill,i.topic,i.template_id,i.level,i.prompt,i.expected_answer,i.kind,i.options_json,i.hint,i.icon,i.fingerprint
    FROM daily_assignments a JOIN learning_items i ON i.id=a.item_id
    WHERE a.day=? ORDER BY a.subject,a.position`).all(day) as AssignmentRow[];
}

function publicQuestion(row: AssignmentRow): LearningQuestion {
  return {
    id: row.assignment_id,
    subject: row.subject,
    skill: row.skill as LearningQuestion["skill"],
    topic: row.topic,
    level: row.level,
    role: row.role === "legacy" ? "current" : row.role,
    templateId: row.template_id,
    label: row.prompt,
    answer: row.expected_answer,
    kind: row.kind,
    options: JSON.parse(row.options_json || "[]"),
    hint: row.hint,
    icon: row.icon || undefined,
    fingerprint: row.fingerprint,
  };
}

export function getOrCreateAssignments(day: string) {
  const database = db();
  let rows = assignmentRows(database, day);
  if (!rows.length) {
    const recent = database.prepare("SELECT i.fingerprint FROM daily_assignments a JOIN learning_items i ON i.id=a.item_id WHERE a.day>=? AND a.day<?").all(addDays(day, -30), day) as Array<{ fingerprint: string }>;
    const previous = database.prepare("SELECT i.template_id FROM daily_assignments a JOIN learning_items i ON i.id=a.item_id WHERE a.day=?").all(addDays(day, -1)) as Array<{ template_id: string }>;
    const generated = generateDailyAssignments({ day, states: currentSkillStates(database), recentFingerprints: recent.map((row) => row.fingerprint), previousTemplates: previous.map((row) => row.template_id) });
    transaction(database, () => {
      for (const subject of ["math", "english"] as const) {
        generated[subject].forEach((question, position) => {
          const itemId = `item-${stableId(question.fingerprint)}`;
          database.prepare(`INSERT OR IGNORE INTO learning_items
            (id,subject,skill,topic,template_id,level,prompt,expected_answer,kind,options_json,hint,icon,fingerprint)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(itemId, subject, question.skill, question.topic, question.templateId, question.level, question.label, question.answer, question.kind, JSON.stringify(question.options ?? []), question.hint, question.icon ?? "", question.fingerprint);
          database.prepare(`INSERT OR IGNORE INTO daily_assignments(id,day,subject,position,item_id,role)
            VALUES(?,?,?,?,?,?)`).run(question.id, day, subject, position, itemId, question.role);
        });
      }
    });
    rows = assignmentRows(database, day);
  }
  return {
    math: rows.filter((row) => row.subject === "math").map(publicQuestion),
    english: rows.filter((row) => row.subject === "english").map(publicQuestion),
    skillProgress: currentSkillStates(database),
  };
}

export function recordAttempts(day: string, subject: LearningSubject, answers: Array<{ questionId: string; answer: string; hintUsed?: boolean; responseMs?: number }>) {
  const database = db();
  const rows = assignmentRows(database, day).filter((row) => row.subject === subject);
  const byId = new Map(rows.map((row) => [row.assignment_id, row]));
  const results: Array<{ questionId: string; correct: boolean; attemptNumber: number }> = [];
  transaction(database, () => {
    for (const input of answers) {
      const row = byId.get(input.questionId);
      if (!row) continue;
      const count = database.prepare("SELECT COUNT(*) AS total FROM attempts WHERE assignment_id=?").get(row.assignment_id) as { total: number };
      const attemptNumber = Number(count.total) + 1;
      const correct = isAnswerCorrect({ answer: row.expected_answer }, String(input.answer ?? ""));
      database.prepare(`INSERT INTO attempts(assignment_id,attempt_number,answer,correct,hint_used,response_ms,created_at)
        VALUES(?,?,?,?,?,?,?)`).run(row.assignment_id, attemptNumber, String(input.answer ?? "").slice(0, 300), correct ? 1 : 0, input.hintUsed ? 1 : 0, Math.max(0, Math.min(3_600_000, Math.round(Number(input.responseMs) || 0))), new Date().toISOString());
      if (correct) database.prepare("UPDATE daily_assignments SET completed_at=COALESCE(completed_at,?) WHERE id=?").run(new Date().toISOString(), row.assignment_id);
      results.push({ questionId: row.assignment_id, correct, attemptNumber });
    }
  });
  return results;
}

function evaluateSkill(database: DatabaseSync, day: string, subject: LearningSubject, skill: string, completedDays: string[]) {
  if (!completedDays.length) return;
  const placeholders = completedDays.map(() => "?").join(",");
  const firstAttempts = database.prepare(`SELECT a.day,t.correct,t.hint_used
    FROM daily_assignments a JOIN learning_items i ON i.id=a.item_id
    JOIN attempts t ON t.assignment_id=a.id AND t.attempt_number=1
    WHERE a.subject=? AND i.skill=? AND a.day IN (${placeholders})`).all(subject, skill, ...completedDays) as Array<{ day: string; correct: number; hint_used: number }>;
  const slowCorrections = database.prepare(`SELECT COUNT(*) AS total FROM (
    SELECT a.id FROM daily_assignments a JOIN learning_items i ON i.id=a.item_id JOIN attempts t ON t.assignment_id=a.id
    WHERE a.subject=? AND i.skill=? AND a.day IN (${placeholders}) GROUP BY a.id HAVING MAX(t.attempt_number)>2
  )`).get(subject, skill, ...completedDays) as { total: number };
  const existing = database.prepare("SELECT * FROM skill_progress WHERE subject=? AND skill=?").get(subject, skill) as Record<string, unknown> | undefined;
  if (String(existing?.last_evaluated_day ?? "") === day) return;
  const total = firstAttempts.length;
  const distinctDays = new Set(firstAttempts.map((attempt) => attempt.day)).size;
  const correct = firstAttempts.filter((attempt) => attempt.correct).length;
  const hints = firstAttempts.filter((attempt) => attempt.hint_used).length;
  const oldLevel = Math.max(0, Number(existing?.level ?? 1));
  const decisionResult = decideSkillAdaptation({ day, level: oldLevel, total, correct, hints, overTwoAttempts: Number(slowCorrections.total), distinctDays });
  const { level: newLevel, decision, reason, reviewDueDates: reviewDue, accuracy } = decisionResult;
  database.prepare(`INSERT INTO skill_progress(subject,skill,level,state,first_attempt_correct,first_attempt_total,accuracy,review_due_json,last_evaluated_day,last_changed_on,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(subject,skill) DO UPDATE SET level=excluded.level,state=excluded.state,first_attempt_correct=excluded.first_attempt_correct,
    first_attempt_total=excluded.first_attempt_total,accuracy=excluded.accuracy,review_due_json=excluded.review_due_json,last_evaluated_day=excluded.last_evaluated_day,
    last_changed_on=excluded.last_changed_on,updated_at=CURRENT_TIMESTAMP`).run(subject, skill, newLevel, decision, correct, total, accuracy, JSON.stringify(reviewDue), day, newLevel !== oldLevel ? day : String(existing?.last_changed_on ?? ""));
  database.prepare(`INSERT INTO adaptation_log(day,subject,skill,old_level,new_level,decision,reason,stats_json)
    VALUES(?,?,?,?,?,?,?,?)`).run(day, subject, skill, oldLevel, newLevel, decision, reason, JSON.stringify({ total, correct, accuracy, hints, overTwoAttempts: Number(slowCorrections.total), distinctDays }));
}

export function completeLearningDay(day: string, doneSubjects: LearningSubject[]) {
  const database = db();
  const math = doneSubjects.includes("math") ? 1 : 0;
  const english = doneSubjects.includes("english") ? 1 : 0;
  database.prepare(`INSERT INTO learning_days(day,math_completed,english_completed,closed_at) VALUES(?,?,?,?)
    ON CONFLICT(day) DO UPDATE SET math_completed=MAX(math_completed,excluded.math_completed),english_completed=MAX(english_completed,excluded.english_completed),closed_at=excluded.closed_at`).run(day, math, english, new Date().toISOString());
  for (const subject of doneSubjects) {
    const column = subject === "math" ? "math_completed" : "english_completed";
    const days = database.prepare(`SELECT day FROM learning_days WHERE day<=? AND ${column}=1 ORDER BY day DESC LIMIT 7`).all(day) as Array<{ day: string }>;
    for (const skill of SUBJECT_SKILLS[subject]) evaluateSkill(database, day, subject, skill, days.map((entry) => entry.day));
  }
}

export function learningDiagnostics() {
  const database = db();
  const count = (table: string) => Number((database.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total);
  return {
    learningItems: count("learning_items"),
    dailyAssignments: count("daily_assignments"),
    attempts: count("attempts"),
    skillProgress: count("skill_progress"),
    adaptationLog: count("adaptation_log"),
  };
}
