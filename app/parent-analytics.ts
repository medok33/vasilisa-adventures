export type AnalyticsStats = {
  assignments: number;
  firstAttemptCorrect: number;
  firstAttemptTotal: number;
  firstAttemptAccuracy: number;
  correctedAfterRetry: number;
  hintsUsed: number;
  averageResponseSeconds: number;
};

export type ParentAnalytics = {
  period: 7 | 14 | 30;
  from: string;
  to: string;
  summary: AnalyticsStats;
  subjects: Array<{ subject: "math" | "english"; label: string; stats: AnalyticsStats }>;
  skills: Array<{ subject: "math" | "english"; skill: string; label: string; level: number; state: string; explanation: string; reviewDueDates: string[]; stats: AnalyticsStats }>;
  weakTopics: Array<{ subject: "math" | "english"; skill: string; label: string; firstAttemptAccuracy: number; nextReviewDate: string | null }>;
};

export const SKILL_LABELS: Record<string, string> = {
  place_value: "Разряды чисел", addition: "Сложение", subtraction: "Вычитание", multiplication: "Умножение", division: "Деление",
  order_operations: "Порядок действий", equations: "Уравнения", word_problem: "Задачи с условием", measurement: "Величины", time: "Время", money: "Деньги", geometry: "Геометрия", patterns: "Закономерности",
  vocabulary: "Слова", translation: "Перевод", spelling: "Написание слов", word_order: "Порядок слов", grammar_to_be: "Формы to be", grammar_have_got: "Have got", grammar_can: "Can", grammar_present_simple: "Present Simple", prepositions: "Предлоги", reading: "Понимание текста", dialogue: "Диалоги",
};

export function safeAnalyticsExport(report: ParentAnalytics) {
  const stats = (value: AnalyticsStats): AnalyticsStats => ({ assignments: value.assignments, firstAttemptCorrect: value.firstAttemptCorrect, firstAttemptTotal: value.firstAttemptTotal, firstAttemptAccuracy: value.firstAttemptAccuracy, correctedAfterRetry: value.correctedAfterRetry, hintsUsed: value.hintsUsed, averageResponseSeconds: value.averageResponseSeconds });
  return {
    title: "Учебная динамика Василисы", period: report.period, from: report.from, to: report.to, summary: stats(report.summary),
    subjects: report.subjects.map((subject) => ({ subject: subject.subject, label: subject.label, stats: stats(subject.stats) })),
    skills: report.skills.map((skill) => ({ subject: skill.subject, skill: skill.skill, label: skill.label, level: skill.level, state: skill.state, explanation: skill.explanation, reviewDueDates: [...skill.reviewDueDates], stats: stats(skill.stats) })),
    weakTopics: report.weakTopics.map((topic) => ({ subject: topic.subject, skill: topic.skill, label: topic.label, firstAttemptAccuracy: topic.firstAttemptAccuracy, nextReviewDate: topic.nextReviewDate })),
  };
}
