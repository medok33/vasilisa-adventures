export type LearningSubject = "math" | "english";

export type LearningQuestion = {
  id: string;
  label: string;
  answer: string;
};

export type LearningAttempt = {
  number: number;
  answer: string;
  correct: boolean;
  checkedAt: string;
};

export type LearningQuestionHistory = {
  questionId: string;
  prompt: string;
  expectedAnswer: string;
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
      attempts: [...attempts, {
        number: attempts.length + 1,
        answer,
        correct: answer.trim() === question.answer,
        checkedAt,
      }],
    };
  });

  return { ...current, [subject]: subjectHistory };
}
