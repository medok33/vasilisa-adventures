import { isAnswerCorrect, type AssignmentRole, type LearningSkill, type LearningSubject, type QuestionKind } from "./learning-system.ts";

export type { LearningSubject } from "./learning-system.ts";

export type LearningQuestion = {
  id: string;
  label: string;
  answer: string;
  subject?: LearningSubject;
  skill?: LearningSkill;
  topic?: string;
  level?: number;
  role?: AssignmentRole;
  templateId?: string;
  kind?: QuestionKind;
};

export type LearningAttempt = {
  number: number;
  answer: string;
  correct: boolean;
  checkedAt: string;
  hintUsed: boolean;
  responseMs: number;
};

export type LearningQuestionHistory = {
  questionId: string;
  prompt: string;
  expectedAnswer: string;
  subject: LearningSubject;
  skill: LearningSkill | "general";
  topic: string;
  level: number;
  role: AssignmentRole | "legacy";
  templateId: string;
  attempts: LearningAttempt[];
};

export type LearningHistory = Record<LearningSubject, Record<string, LearningQuestionHistory>>;

export function emptyLearningHistory(): LearningHistory {
  return { math: {}, english: {} };
}

export function recordLearningAttempt(
  history: LearningHistory | undefined,
  subject: LearningSubject,
  questions: readonly LearningQuestion[],
  answers: readonly string[],
  checkedAt: string,
  attemptMeta: ReadonlyArray<{ hintUsed?: boolean; responseMs?: number }> = [],
): LearningHistory {
  const current = history ?? emptyLearningHistory();
  const subjectHistory = { ...(current[subject] ?? {}) };

  questions.forEach((question, index) => {
    const previous = subjectHistory[question.id];
    const attempts = previous?.attempts ?? [];
    const answer = answers[index] ?? "";
    subjectHistory[question.id] = {
      questionId: question.id,
      prompt: question.label,
      expectedAnswer: question.answer,
      subject,
      skill: question.skill ?? "general",
      topic: question.topic ?? question.skill ?? "general",
      level: Math.max(0, Math.round(question.level ?? 1)),
      role: question.role ?? "legacy",
      templateId: question.templateId ?? "legacy",
      attempts: [...attempts, {
        number: attempts.length + 1,
        answer,
        correct: isAnswerCorrect(question, answer),
        checkedAt,
        hintUsed: Boolean(attemptMeta[index]?.hintUsed),
        responseMs: Math.max(0, Math.min(3_600_000, Math.round(attemptMeta[index]?.responseMs ?? 0))),
      }],
    };
  });

  return { ...current, [subject]: subjectHistory };
}
