"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { BOOKS, cleanBookReflections, cleanRanges, continuousPage, getBook, getReadingQuestion, isBookFinished, isCurrentReadingCorrect, isReadingAnswerCorrect, mergeRanges, nextBook, readingQuestionsForRange, readingStarCount, type BookId, type BookProgress, type BookReflections, type DailyReadingSession } from "./books";
import { dailyContent } from "./daily-content";
import { emptyLearningHistory, recordLearningAttempt, type LearningHistory, type LearningSubject } from "./learning-history";
import { isAnswerCorrect, type LearningQuestion } from "./learning-system";

type MissionId = "morning" | "reading" | "math" | "english" | "order" | "kindness" | "independence";
type View = "home" | "wallet" | "journal" | "parent" | MissionId;
type NavSection = "today" | "wallet" | "journal" | "parent";
type CelebrationEvent = { id: MissionId; text: string; stars: number };
type HistoryDay = { day: string; progress: Partial<Progress>; stars: number; tomorrowLimit: number; closed: boolean };
type DadContacts = { phone: string; vkUrl: string; maxUrl: string };
type Progress = {
  done: MissionId[];
  morningChecks: string[];
  readingStart: string;
  readingEnd: string;
  readingMinutes: number;
  readingAnswer: string;
  readingBook: BookId;
  bookProgress: BookProgress;
  bookReflections: BookReflections;
  readingQuestionAnswers: Record<string, string>;
  readingSession: DailyReadingSession | null;
  mathAnswers: string[];
  mathAttempts: number;
  englishAnswers: string[];
  englishAttempts: number;
  learningHistory: LearningHistory;
  learningHints: Record<string, boolean>;
  orderChecks: string[];
  kindnessChoice: string;
  kindnessNote: string;
  independenceChoice: string;
  independenceNote: string;
  mood: string;
  goodThing: string;
  hardThing: string;
  dadNote: string;
  dadNotifiedText: string;
  dadNotifiedAt: string;
  balance: number;
  goalTitle: string;
  goalAmount: number;
  reserveStar: boolean;
  decision: string;
  savingsTransfer: number;
  savingsApplied: boolean;
  motherSignature: string; // Legacy storage key retained so existing signed days keep loading.
  signedAt: string;
};

type Mission = {
  id: MissionId;
  index: string;
  kicker: string;
  title: string;
  note: string;
  reward: string;
  accent: string;
};


const missions: Mission[] = [
  { id: "morning", index: "01", kicker: "Начало дня", title: "Утренний запуск", note: "4 простых шага для бодрого старта", reward: "1 ⭐", accent: "sun" },
  { id: "reading", index: "02", kicker: "Главный квест", title: "Изумрудная книга", note: "Чтение, страницы и вопрос по сюжету", reward: "до 3 ⭐", accent: "mint" },
  { id: "math", index: "03", kicker: "Тренировка", title: "Шифр экспедиции", note: "5 задач уровня 3-го класса", reward: "2 ⭐", accent: "blue" },
  { id: "english", index: "04", kicker: "Разведка", title: "Слова вокруг нас", note: "5 слов и одна короткая фраза", reward: "1 ⭐", accent: "coral" },
  { id: "order", index: "05", kicker: "Домашняя миссия", title: "Пять минут порядка", note: "Комната, стол, одежда и обувь", reward: "1 ⭐", accent: "amber" },
  { id: "kindness", index: "06", kicker: "Секретная миссия", title: "Заметить другого", note: "Выбери одно настоящее доброе дело", reward: "1 ⭐", accent: "rose" },
  { id: "independence", index: "07", kicker: "Суперспособность", title: "Без напоминания", note: "Что сегодня получилось сделать самой?", reward: "1 ⭐", accent: "violet" },
];

const emptyProgress: Progress = {
  done: [], morningChecks: [], readingStart: "", readingEnd: "", readingMinutes: 15, readingAnswer: "", readingBook: "emerald", bookProgress: {}, bookReflections: {}, readingQuestionAnswers: {}, readingSession: null,
  mathAnswers: ["", "", "", "", ""], mathAttempts: 0, englishAnswers: ["", "", "", "", "", ""], englishAttempts: 0, learningHistory: emptyLearningHistory(), learningHints: {}, orderChecks: [],
  kindnessChoice: "", kindnessNote: "", independenceChoice: "", independenceNote: "", mood: "", goodThing: "", hardThing: "", dadNote: "", dadNotifiedText: "", dadNotifiedAt: "",
  balance: 0, goalTitle: "", goalAmount: 0, reserveStar: false, decision: "",
  savingsTransfer: 0, savingsApplied: false, motherSignature: "", signedAt: "",
};

const morningItems = [
  ["wash", "Умылась и почистила зубы"],
  ["bed", "Заправила кровать"],
  ["breakfast", "Позавтракала и убрала за собой"],
  ["exercise", "Сделала зарядку 5 минут"],
];
const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Europe/Moscow";
function currentDay() { return new Intl.DateTimeFormat("sv-SE", { timeZone: APP_TIME_ZONE }).format(new Date()); }
function dayLabel(day: string) { return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`)); }
function clampMoney(value: number) { return Math.max(0, Math.min(1_000_000, Math.round(value || 0))); }
const viewHashes: Record<Exclude<View, "home">, string> = {
  wallet: "wallet", journal: "journal", parent: "parent", morning: "morning", reading: "reading", math: "math", english: "english", order: "order", kindness: "kindness", independence: "independence",
};
function viewFromHash(hash: string): View {
  const value = hash.replace(/^#/, "");
  return (Object.entries(viewHashes).find(([, route]) => route === value)?.[0] as View | undefined) ?? "home";
}

export default function Adventure() {
  const [day] = useState(currentDay);
  const [view, setView] = useState<View>("home");
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [todayLimit, setTodayLimit] = useState(100);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "offline">("saving");
  const [mathChecked, setMathChecked] = useState(false);
  const [englishChecked, setEnglishChecked] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [learningAssignments, setLearningAssignments] = useState<{ math: LearningQuestion[]; english: LearningQuestion[] } | null>(null);
  const [dadContacts, setDadContacts] = useState<DadContacts | null>(null);
  const questionStartedAt = useRef<Record<string, number>>({});
  const content = useMemo(() => dailyContent(day), [day]);
  const mathQuestions = learningAssignments?.math ?? [];
  const englishQuestions = learningAssignments?.english ?? [];
  const orderItems = useMemo(() => content.order.map((label, index) => [`daily-${index}`, label]), [content.order]);
  const todayReading = progress.readingSession?.day === day ? progress.readingSession : null;
  const readingBook = getBook(todayReading?.bookId ?? progress.readingBook);
  const savedReadingRanges = cleanRanges(progress.bookProgress?.[readingBook.id], readingBook);
  const confirmedReadingPage = continuousPage(savedReadingRanges, readingBook);
  const answeredReadingQuestions = readingBook.questions.filter((question) => isReadingAnswerCorrect(question, progress.readingQuestionAnswers?.[question.id])).map((question) => question.id);
  const sessionQuestions = todayReading?.questionIds.flatMap((questionId) => {
    const question = getReadingQuestion(readingBook, questionId);
    return question ? [question] : [];
  }) ?? [];
  const currentReadingCorrect = isCurrentReadingCorrect(todayReading, day);
  const bookFinished = isBookFinished(savedReadingRanges, readingBook);
  const bookReflection = progress.bookReflections?.[readingBook.id] ?? { text: "", savedAt: "", bonusStars: 0, bonusAwardedAt: "" };
  const showBookReflection = bookFinished && (!todayReading || todayReading.finished);
  const needsBookReflection = showBookReflection && !bookReflection.savedAt;

  const readingStars = readingStarCount(todayReading, progress.done.includes("reading"), day);
  const earnedStars = (() => {
    const fixed = progress.done.reduce((sum, id) => sum + (id === "math" ? 2 : id === "reading" ? 0 : 1), 0);
    return Math.min(10, fixed + readingStars + (progress.reserveStar && fixed + readingStars === 9 ? 1 : 0));
  })();
  const rewardBudget = earnedStars * 15;
  const savingsTransfer = Math.min(Math.floor(rewardBudget / 10) * 10, progress.savingsTransfer);
  const tomorrowLimit = 100 + rewardBudget - savingsTransfer;
  const weekDays = useMemo(() => history.filter((item) => item.day < day).slice(0, 6), [day, history]);
  const weeklyFragments = weekDays.filter((item) => item.stars >= 7).length + (earnedStars >= 7 ? 1 : 0);

  useEffect(() => {
    const restoreView = () => setView(viewFromHash(window.location.hash));
    restoreView();
    window.addEventListener("hashchange", restoreView);
    window.addEventListener("popstate", restoreView);
    return () => {
      window.removeEventListener("hashchange", restoreView);
      window.removeEventListener("popstate", restoreView);
    };
  }, []);

  useEffect(() => {
    Promise.all([fetch(`/api/progress?day=${day}`), fetch(`/api/learning?day=${day}`)]).then(async ([response, learningResponse]) => {
      if (!response.ok || !learningResponse.ok) throw new Error("load");
      const data = await response.json() as { progress?: Partial<Progress>; closed?: boolean; todayLimit?: number };
      const learning = await learningResponse.json() as { math?: LearningQuestion[]; english?: LearningQuestion[] };
      if (learning.math?.length !== 5 || learning.english?.length !== 6) throw new Error("learning-load");
      setLearningAssignments({ math: learning.math, english: learning.english });
      const loadedProgress = { ...emptyProgress, ...(data.progress ?? {}), done: (data.progress?.done ?? []) as MissionId[] };
      setProgress({ ...loadedProgress, bookProgress: loadedProgress.bookProgress ?? {}, bookReflections: cleanBookReflections(loadedProgress.bookReflections), readingQuestionAnswers: loadedProgress.readingQuestionAnswers ?? {}, learningHistory: loadedProgress.learningHistory ?? emptyLearningHistory(), learningHints: loadedProgress.learningHints ?? {} });
      setClosed(Boolean(data.closed)); setTodayLimit(Number(data.todayLimit) || 100); setSaveState("saved"); setLoaded(true);
    }).catch(() => setSaveState("offline"));
  }, [day]);

  useEffect(() => {
    fetch("/api/contact")
      .then(async (response) => {
        if (!response.ok) throw new Error("contact");
        return response.json() as Promise<DadContacts>;
      })
      .then(setDadContacts)
      .catch(() => setDadContacts(null));
  }, []);

  useEffect(() => {
    fetch("/api/progress?history=1")
      .then(async (response) => {
        if (!response.ok) throw new Error("history");
        const data = await response.json() as { days?: HistoryDay[] };
        setHistory(data.days ?? []);
      })
      .finally(() => setHistoryLoading(false));
  }, [closed]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [view]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ day, progress, stars: earnedStars, closed }) })
        .then((response) => { if (!response.ok) throw new Error("save"); setSaveState("saved"); })
        .catch(() => setSaveState("offline"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [closed, day, earnedStars, loaded, progress]);

  function patch(next: Partial<Progress>) { if (!closed) setProgress((current) => ({ ...current, ...next })); }
  function goTo(next: View) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const hash = next === "home" ? "" : `#${viewHashes[next]}`;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
    flushSync(() => setView(next));
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }
  function reopenDay() {
    setProgress((current) => ({
      ...current,
      balance: current.savingsApplied ? Math.max(0, current.balance - current.savingsTransfer) : current.balance,
      savingsApplied: false,
      motherSignature: "",
      signedAt: "",
    }));
    setClosed(false);
  }
  function closeDay(signature: string) {
    setProgress((current) => ({
      ...current,
      balance: current.savingsApplied ? current.balance : current.balance + Math.min(Math.floor(earnedStars * 15 / 10) * 10, current.savingsTransfer),
      savingsTransfer: Math.min(Math.floor(earnedStars * 15 / 10) * 10, current.savingsTransfer),
      savingsApplied: true,
      motherSignature: signature,
      signedAt: new Date().toISOString(),
    }));
    setClosed(true);
  }
  function toggleList(field: "morningChecks" | "orderChecks", id: string) {
    if (closed) return;
    setProgress((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((item) => item !== id) : [...current[field], id] }));
  }
  function setAnswer(field: "mathAnswers" | "englishAnswers", index: number, value: string) {
    if (closed) return;
    setProgress((current) => { const next = [...current[field]]; next[index] = value; return { ...current, [field]: next }; });
  }
  function markQuestionStarted(questionId: string) {
    questionStartedAt.current[questionId] ??= Date.now();
  }
  function showLearningHint(questionId: string) {
    markQuestionStarted(questionId);
    patch({ learningHints: { ...progress.learningHints, [questionId]: true } });
  }
  async function checkLearning(subject: LearningSubject) {
    if (!learningAssignments || closed || progress.done.includes(subject)) return;
    const questions = subject === "math" ? mathQuestions : englishQuestions;
    const answers = subject === "math" ? progress.mathAnswers : progress.englishAnswers;
    const checkedAt = new Date().toISOString();
    const attemptMeta = questions.map((question) => ({ hintUsed: Boolean(progress.learningHints[question.id]), responseMs: Math.max(0, Date.now() - (questionStartedAt.current[question.id] ?? Date.now())) }));
    let results: Array<{ questionId: string; correct: boolean }>;
    try {
      const response = await fetch("/api/learning", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day, subject, answers: questions.map((question, index) => ({ questionId: question.id, answer: answers[index] ?? "", ...attemptMeta[index] })) }),
      });
      if (!response.ok) throw new Error("learning-attempt");
      results = ((await response.json()) as { results?: Array<{ questionId: string; correct: boolean }> }).results ?? [];
    } catch {
      setSaveState("offline");
      return;
    }
    const resultById = new Map(results.map((result) => [result.questionId, result.correct]));
    const allCorrect = results.length === questions.length && questions.every((question) => resultById.get(question.id) === true);
    setProgress((current) => ({
      ...current,
      [subject === "math" ? "mathAttempts" : "englishAttempts"]: current[subject === "math" ? "mathAttempts" : "englishAttempts"] + 1,
      learningHistory: recordLearningAttempt(current.learningHistory, subject, questions, subject === "math" ? current.mathAnswers : current.englishAnswers, checkedAt, attemptMeta),
      done: allCorrect && !current.done.includes(subject) ? [...current.done, subject] : current.done,
    }));
    if (subject === "math") setMathChecked(true); else setEnglishChecked(true);
    if (!allCorrect) return;
    setCelebration({ id: subject, text: subject === "math" ? "Шифр экспедиции разгадан" : "English-разведка завершена", stars: subject === "math" ? 2 : 1 });
    navigator.vibrate?.([35, 30, 75]);
    window.setTimeout(() => { setCelebration(null); goTo("home"); }, 2400);
  }
  function complete(id: MissionId, message: string, stars = 1) {
    if (closed) return;
    setProgress((current) => ({ ...current, done: current.done.includes(id) ? current.done : [...current.done, id] }));
    setCelebration({ id, text: message, stars });
    navigator.vibrate?.([35, 30, 75]);
    window.setTimeout(() => { setCelebration(null); goTo("home"); }, 2400);
  }
  function beginReading() {
    if (closed || todayReading || !readingReady) return;
    const from = nextReadingPage;
    const to = Number(progress.readingEnd);
    const questions = readingQuestionsForRange(readingBook, { from, to }, answeredReadingQuestions);
    setProgress((current) => {
      const existing = cleanRanges(current.bookProgress?.[readingBook.id], readingBook);
      const merged = mergeRanges(existing, [{ from, to }], readingBook);
      return {
        ...current,
        done: current.done.includes("reading") ? current.done : [...current.done, "reading"],
        readingStart: String(from),
        bookProgress: { ...current.bookProgress, [readingBook.id]: merged },
        readingSession: { day, bookId: readingBook.id, from, to, minutes: current.readingMinutes, questionIds: questions.map((question) => question.id), answers: {}, finished: false },
      };
    });
  }
  function answerReadingQuestion(questionId: string, answer: string) {
    if (closed) return;
    setProgress((current) => {
      const session = current.readingSession;
      if (!session || session.day !== day || !session.questionIds.includes(questionId)) return current;
      const question = getReadingQuestion(getBook(session.bookId), questionId);
      const readingQuestionAnswers = isReadingAnswerCorrect(question, answer)
        ? { ...current.readingQuestionAnswers, [questionId]: answer }
        : current.readingQuestionAnswers;
      return { ...current, readingQuestionAnswers, readingSession: { ...session, answers: { ...session.answers, [questionId]: answer } } };
    });
  }
  function finishReading() {
    if (closed || !todayReading || todayReading.finished) return;
    const finishedSession = { ...todayReading, finished: true };
    const stars = readingStarCount(finishedSession, true, day);
    setProgress((current) => ({ ...current, readingSession: current.readingSession?.day === day ? { ...current.readingSession, finished: true } : current.readingSession }));
    setCelebration({ id: "reading", text: currentReadingCorrect ? "Бонусная звезда открыта" : "Чтение на сегодня завершено", stars });
    navigator.vibrate?.([35, 30, 75]);
    window.setTimeout(() => { setCelebration(null); if (!bookFinished) goTo("home"); }, 2400);
  }
  function updateBookReflection(text: string) {
    setProgress((current) => ({
      ...current,
      bookReflections: { ...current.bookReflections, [readingBook.id]: { text: text.slice(0, 3000), savedAt: "", bonusStars: 0, bonusAwardedAt: "" } },
    }));
  }
  function saveBookReflection() {
    if (closed || !bookReflection.text.trim()) return;
    const awardedAt = new Date().toISOString();
    setProgress((current) => ({
      ...current,
      bookReflections: { ...current.bookReflections, [readingBook.id]: { text: bookReflection.text.trim(), savedAt: awardedAt, bonusStars: 10, bonusAwardedAt: awardedAt } },
    }));
    setCelebration({ id: "reading", text: "Папин бонус за книжную заметку", stars: 10 });
    navigator.vibrate?.([35, 30, 75]);
    window.setTimeout(() => setCelebration(null), 2400);
  }
  function openSection(section: NavSection) {
    if (section === "today") {
      goTo("home");
      return;
    }
    goTo(section === "parent" ? "parent" : section);
  }
  async function notifyDad(note: string) {
    const response = await fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ day, note }),
    });
    if (!response.ok) throw new Error("notify");
    const result = await response.json() as { delivered?: boolean };
    if (result.delivered) patch({ dadNotifiedText: note, dadNotifiedAt: new Date().toISOString() });
    return Boolean(result.delivered);
  }
  const activeSection: NavSection = view === "wallet" || view === "journal" || view === "parent" ? view : "today";
  const bottomNav = <BottomNav active={activeSection} onOpen={openSection} />;

  const mathAllCorrect = mathQuestions.every((question, index) => isAnswerCorrect({ answer: question.answer }, progress.mathAnswers[index] ?? ""));
  const englishAllCorrect = englishQuestions.every((question, index) => isAnswerCorrect({ answer: question.answer }, progress.englishAnswers[index] ?? ""));
  const nextReadingPage = Math.max(readingBook.firstPage, confirmedReadingPage + 1);
  const readingReady = Boolean(!todayReading && progress.readingEnd && Number(progress.readingEnd) >= nextReadingPage && Number(progress.readingEnd) <= readingBook.lastPage);
  const draftReadingQuestions = readingReady ? readingQuestionsForRange(readingBook, { from: nextReadingPage, to: Number(progress.readingEnd) }, answeredReadingQuestions) : [];
  const readingPotential = todayReading ? readingStarCount(todayReading, true, day) : !readingReady ? 0 : progress.readingMinutes >= 20 ? 2 : 1;

  if (view !== "home" && view !== "wallet" && view !== "journal" && view !== "parent") {
    const mission = missions.find((item) => item.id === view)!;
    return <>
      <main className={`activity-shell ${mission.accent}`}>
        <ActivityHeader mission={mission} onBack={() => goTo("home")} done={progress.done.includes(mission.id)} />
        <section className={`activity-card ${closed ? "is-locked" : ""}`}>
          {closed && <DayLockedBanner onUnlock={reopenDay} />}
          {view === "morning" && <>
            <Intro title="Запусти день спокойно" text="Отмечай по одному пункту. За весь блок начисляется одна звезда — не за каждое действие отдельно." />
            <CheckList items={morningItems} selected={progress.morningChecks} onToggle={(id) => toggleList("morningChecks", id)} />
            <ActionButton disabled={progress.morningChecks.length !== morningItems.length} onClick={() => complete("morning", "Утренний запуск завершён")}>Завершить утренний запуск</ActionButton>
          </>}
          {view === "reading" && <>
            <Intro title={readingBook.title} text={needsBookReflection ? "Книга дочитана. Теперь можно сохранить свою книжную заметку." : todayReading ? "Сегодняшнее чтение уже сохранено." : "Укажи, до какой страницы ты дочитала сегодня."} />
            <details className="book-details"><summary>О книге</summary><span>Страницы издания: {readingBook.firstPage}–{readingBook.lastPage}</span><span>ISBN {readingBook.isbn}</span></details>
            {!todayReading && !needsBookReflection && <>
              <div className="reading-levels">{[{m:15,s:1,t:"Разминка"},{m:20,s:2,t:"Исследователь"},{m:30,s:2,t:"Книжный герой"}].map((level) => <button key={level.m} className={progress.readingMinutes === level.m ? "selected" : ""} onClick={() => patch({ readingMinutes: level.m })}><strong>{level.m} мин</strong><span>{level.t}</span><b>{level.s} ⭐</b></button>)}</div>
              <div className="reading-entry"><div><span>Сегодня начинаем</span><strong>{confirmedReadingPage < readingBook.firstPage ? "с первой страницы книги" : `со страницы ${nextReadingPage}`}</strong></div><label><span>Дочитала до</span><input aria-label="До какой страницы дочитала сегодня" inputMode="numeric" min={nextReadingPage} max={readingBook.lastPage} value={progress.readingEnd} onChange={(e) => patch({ readingEnd: e.target.value })} placeholder="№" /></label></div>
              {readingReady && <p className="reading-next-step">Страницы сохранятся сразу. Дальше будет {draftReadingQuestions.length === 1 ? "один короткий вопрос о главной мысли" : "спокойное завершение чтения без вопроса"}.</p>}
              <div className="live-result"><span>Уже за чтение</span><strong>{readingPotential} ⭐</strong>{readingPotential >= 1 && <small>На смысловой точке можно открыть ещё одну бонусную звезду.</small>}</div>
              <ActionButton disabled={!readingReady} onClick={beginReading}>Сохранить прочитанные страницы</ActionButton>
            </>}
            {todayReading && <>
              <div className="reading-saved-range"><span>Сегодня сохранено</span><strong>страницы {todayReading.from}–{todayReading.to} · {todayReading.minutes} минут</strong></div>
              {sessionQuestions.map((question) => <section className="reading-question" key={question.id}><span>Главная мысль этого отрывка</span><small className="reading-focus">В книжном чек-листе: {question.focus}</small><strong>{question.prompt}</strong><div className="reading-options">{question.options.map((option) => <button disabled={todayReading.finished} key={option} className={todayReading.answers[question.id] === option ? "selected" : ""} onClick={() => answerReadingQuestion(question.id, option)}>{option}</button>)}</div>{todayReading.answers[question.id] && !isReadingAnswerCorrect(question, todayReading.answers[question.id]) && <small>Страницы и звёзды за чтение уже сохранены. Можно спокойно выбрать другой вариант.</small>}</section>)}
              {sessionQuestions.length === 0 && <Feedback>Страницы и звёзды за чтение уже сохранены. В этом отрывке нет новой контрольной точки — сегодня вопрос не нужен.</Feedback>}
              {currentReadingCorrect && <div className="reading-answer-ok"><strong>Главная мысль найдена · бонусная ⭐ открыта</strong><span>Это дополнительная награда к уже сохранённому чтению.</span></div>}
              <div className="live-result"><span>{currentReadingCorrect ? "Бонусная звезда открыта" : "За чтение уже сохранено"}</span><strong>{readingPotential} ⭐</strong>{!currentReadingCorrect && sessionQuestions.length > 0 && <small>Если захочется, можно выбрать ответ или завершить чтение сейчас.</small>}</div>
              {!todayReading.finished && <ActionButton onClick={finishReading}>Завершить чтение</ActionButton>}
              {todayReading.finished && <div className="reading-finished"><strong>Чтение на сегодня завершено</strong><span>{readingPotential} ⭐ сохранено в результате дня</span></div>}
            </>}
            {showBookReflection && <section className="book-reflection"><span>Книжная заметка · без оценок</span><h2>Василиса, вот ты и дочитала книгу «{readingBook.title}»</h2><p>Поделись своими впечатлениями: как ты поняла эту историю, что хочется отметить, что понравилось или расстроило. Текст никто не проверяет по образцу — важны только твои мысли.</p><div className="dad-book-bonus"><b>Папин персональный бонус: +10 ⭐</b><small>За завершённую книгу и твою собственную заметку — содержание текста не оценивается.</small></div><label><span>Мои мысли о книге</span><textarea disabled={Boolean(bookReflection.savedAt) || closed} value={bookReflection.text} onChange={(event) => updateBookReflection(event.target.value)} maxLength={3000} placeholder="Можно начать так: «Для меня эта книга о…»" /></label>{!bookReflection.savedAt ? <button className="primary-action" disabled={!bookReflection.text.trim() || closed} onClick={saveBookReflection}>Сохранить заметку и получить +10 ⭐ от папы</button> : <div className="book-reflection-saved"><strong>Твоя книжная заметка сохранена · +10 ⭐ от папы</strong><span>Это твой личный взгляд на историю — он не оценивается.</span></div>}</section>}
            {showBookReflection && Boolean(bookReflection.savedAt) && nextBook(readingBook.id) && <button className="next-book" onClick={() => { patch({ readingBook: nextBook(readingBook.id)!.id, readingStart: "", readingEnd: "", readingAnswer: "" }); goTo("home"); }}>Следующая книга: «{nextBook(readingBook.id)!.title}» →</button>}
          </>}
          {view === "math" && <>
            <Intro title="Введи код экспедиции" text="Решай в своём темпе. Ответы можно менять столько раз, сколько захочется." />
            {!learningAssignments && saveState === "offline" && <Feedback>Учебные задания пока не загрузились. Проверь связь и обнови страницу — ответы не потеряются.</Feedback>}
            <div className="math-list">{mathQuestions.map((question, index) => { const value = progress.mathAnswers[index] ?? ""; const ok = isAnswerCorrect({ answer: question.answer }, value); return <label className={mathChecked ? ok ? "correct" : "retry" : ""} key={question.id}><span><small>Задание {index + 1} · {question.role === "reinforcement" ? "закрепление" : question.role === "stretch" ? "небольшой вызов" : "текущий уровень"}</small>{question.label}</span><input inputMode="numeric" value={value} onFocus={() => markQuestionStarted(question.id)} onChange={(e) => { markQuestionStarted(question.id); setMathChecked(false); setAnswer("mathAnswers", index, e.target.value); }} placeholder="Ответ" /><div className="learning-assist">{Boolean(question.hint) && <button type="button" className="learning-hint-button" onClick={(event) => { event.preventDefault(); showLearningHint(question.id); }}>Подсказка</button>}{progress.learningHints[question.id] && <em className="learning-hint-text">{question.hint}</em>}{mathChecked && <b>{ok ? "Получилось" : "Можно ещё раз"}</b>}</div></label>; })}</div>
            {mathChecked && !mathAllCorrect && <Feedback>Часть ответов уже получилась. Остальные можно спокойно посмотреть ещё раз — подсказки рядом.</Feedback>}
            <ActionButton disabled={!learningAssignments || progress.mathAnswers.some((item) => !item) || progress.done.includes("math")} onClick={() => checkLearning("math")}>{mathChecked && mathAllCorrect ? "Шифр открыт!" : "Проверить ответы"}</ActionButton>
          </>}
          {view === "english" && <>
            <Intro title="Собери словарь разведчика" text="Выполни шесть коротких заданий: выбирай ответы или пиши английские слова и фразы." />
            {!learningAssignments && saveState === "offline" && <Feedback>Учебные задания пока не загрузились. Проверь связь и обнови страницу — ответы не потеряются.</Feedback>}
            <div className="english-list">{englishQuestions.map((question, index) => { const chosen = progress.englishAnswers[index] ?? ""; const ok = isAnswerCorrect({ answer: question.answer }, chosen); const isInput = "kind" in question && question.kind === "input"; return <article className={englishChecked ? ok ? "correct" : "retry" : ""} key={question.id}><div className="word-prompt"><strong>{question.icon}</strong><span>{question.label}</span></div>{isInput ? <input className="english-text-answer" value={chosen} onFocus={() => markQuestionStarted(question.id)} onChange={(event) => { markQuestionStarted(question.id); setEnglishChecked(false); setAnswer("englishAnswers", index, event.target.value); }} placeholder="Напиши ответ" /> : <div className="word-options">{question.options?.map((option) => <button className={chosen === option ? "chosen" : ""} onClick={() => { markQuestionStarted(question.id); setEnglishChecked(false); setAnswer("englishAnswers", index, option); }} key={option}>{option}</button>)}</div>}{"hint" in question && Boolean(question.hint) && <button type="button" className="learning-hint-button" onClick={() => showLearningHint(question.id)}>Подсказка</button>}{progress.learningHints[question.id] && "hint" in question && <em className="learning-hint-text">{String(question.hint)}</em>}{englishChecked && <small>{ok ? "Получилось!" : "Можно ещё раз"}</small>}</article>; })}</div>
            {englishChecked && !englishAllCorrect && <Feedback>Часть ответов уже готова. Остальные можно спокойно посмотреть ещё раз — подсказки рядом.</Feedback>}
            <ActionButton disabled={!learningAssignments || progress.englishAnswers.some((item) => !item) || progress.done.includes("english")} onClick={() => checkLearning("english")}>Проверить всю разведку</ActionButton>
          </>}
          {view === "order" && <>
            <Intro title="Порядок за пять минут" text="Сегодня новый короткий набор. Достаточно выполнить любые три пункта." />
            <div className="timer-card"><span>05:00</span><p>Включи обычный таймер на телефоне и начинай</p></div>
            <CheckList items={orderItems} selected={progress.orderChecks} onToggle={(id) => toggleList("orderChecks", id)} />
            <ActionButton disabled={progress.orderChecks.length < 3} onClick={() => complete("order", "Остров порядка готов")}>Порядок наведен</ActionButton>
          </>}
          {view === "kindness" && <>
            <Intro title="Секретная миссия дня" text={content.secret} />
            <ChoiceList options={[...content.kindness, "Своё доброе дело"]} selected={progress.kindnessChoice} onSelect={(kindnessChoice) => patch({ kindnessChoice })} />
            <label className="long-field optional"><span>Что именно ты сделала? <em>необязательно</em></span><textarea value={progress.kindnessNote} onChange={(e) => patch({ kindnessNote: e.target.value })} placeholder="Можно оставить маленькую заметку" /></label>
            <ActionButton disabled={!progress.kindnessChoice || (progress.kindnessChoice === "Своё доброе дело" && progress.kindnessNote.trim().length < 3)} onClick={() => complete("kindness", "Добрая миссия выполнена")}>Миссия сделана</ActionButton>
          </>}
          {view === "independence" && <>
            <Intro title="Что получилось без напоминания?" text="Выбери только то, о чём сегодня действительно вспомнила сама. Эту звезду вечером подтверждает мама." />
            <ChoiceList options={[...content.independence, "Свой вариант"]} selected={progress.independenceChoice} onSelect={(independenceChoice) => patch({ independenceChoice })} />
            {progress.independenceChoice === "Свой вариант" && <label className="long-field"><span>Что именно получилось самой?</span><textarea value={progress.independenceNote} onChange={(e) => patch({ independenceNote: e.target.value })} placeholder="Напиши коротко" /></label>}
            <ActionButton disabled={!progress.independenceChoice || (progress.independenceChoice === "Свой вариант" && progress.independenceNote.trim().length < 3)} onClick={() => complete("independence", "Суперспособность открыта")}>Я действительно сделала сама</ActionButton>
          </>}
        </section>
        {celebration && <Celebration event={celebration} />}
      </main>
      {bottomNav}
    </>;
  }

  if (view === "wallet") return <><WalletScreen progress={progress} patch={patch} todayLimit={todayLimit} tomorrowLimit={tomorrowLimit} rewardBudget={rewardBudget} closed={closed} onUnlock={reopenDay} onBack={() => goTo("home")} />{bottomNav}</>;
  if (view === "journal") return <><JournalScreen day={day} progress={progress} patch={patch} history={history} historyLoading={historyLoading} dadContacts={dadContacts} closed={closed} onUnlock={reopenDay} onNotifyDad={notifyDad} onBack={() => goTo("home")} />{bottomNav}</>;
  if (view === "parent") return <><ParentScreen day={day} progress={progress} patch={patch} closed={closed} onCloseDay={closeDay} onReopenDay={reopenDay} stars={earnedStars} tomorrowLimit={tomorrowLimit} rewardBudget={rewardBudget} onBack={() => goTo("home")} onOpenMission={(id) => goTo(id)} onOpenWallet={() => goTo("wallet")} />{bottomNav}</>;

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="profile-dot" type="button" aria-label="Профиль Василисы">В</button>
        <div><strong>Приключения Василисы</strong><span>{dayLabel(day)}</span></div>
        <nav className="desktop-nav" aria-label="Разделы приложения"><button className={activeSection==="today"?"active":""} onClick={() => openSection("today")}>Сегодня</button><button className={activeSection==="wallet"?"active":""} onClick={() => openSection("wallet")}>Копилка</button><button className={activeSection==="journal"?"active":""} onClick={() => openSection("journal")}>Мой день</button></nav>
        <div className={`sync-state ${saveState}`}>{saveState === "saved" ? "Сохранено" : saveState === "saving" ? "Сохраняю" : "Без связи"}</div>
      </header>

      <section className={`game-hero mood-${earnedStars < 3 ? "start" : earnedStars < 6 ? "curious" : earnedStars < 9 ? "brave" : "shine"}`} id="today-anchor">
        <div className="hero-content"><p className="hero-label">День 1 · Солнечная экспедиция</p><h1>Твой день.<br/>Твой маршрут.</h1><p>Семь коротких миссий для ума, характера и хорошего настроения. Начинай с любой.</p><span className="hero-mood">{earnedStars < 3 ? "Василиса готова начинать" : earnedStars < 6 ? "Уже вошла во вкус!" : earnedStars < 9 ? "Вот это уверенный темп!" : "Сегодня всё сияет!"}</span><div className="hero-actions"><button onClick={() => goTo(missions.find((m) => !progress.done.includes(m.id))?.id ?? "journal")}>{earnedStars === 10 ? "Записать итог дня" : "Следующая миссия"}<span aria-hidden="true">→</span></button><div className="hero-progress"><b>{progress.done.length}/7</b><span>миссий готово</span></div></div></div>
        <picture className="hero-art"><span className="hero-sparkles" aria-hidden="true"><i/><i/><i/></span><img src="/vasilisa-hero-cartoon-v4.webp" alt="Мультяшная Василиса с двумя косами держит светящуюся звезду" /></picture>
      </section>

      <section className="dashboard-strip" id="wallet-anchor">
        <button className="money-stat" onClick={() => goTo("wallet")}><span>Можно сегодня</span><strong>{todayLimit} ₽</strong><small>В копилке {progress.balance.toLocaleString("ru-RU")} ₽ <b>→</b></small></button>
        <div className="star-summary"><span>Звёзды сегодня</span><strong>{earnedStars}<small> из 10</small></strong><div className="mini-stars">{Array.from({length:10},(_,i)=><i className={i<earnedStars?"filled":""} key={i} />)}</div></div>
        <div className="tomorrow-stat"><span>Откроется завтра</span><strong>{tomorrowLimit} ₽</strong><small>После проверки мамой</small></div>
      </section>

      <section className="weekly-card"><div><span>Большая миссия недели</span><h2>Собери 5 солнечных фрагментов</h2><p>Фрагмент открывается за день с 7 или более звёздами. В конце недели выбери одно большое семейное приключение.</p></div><div className="weekly-fragments" aria-label={`${Math.min(5, weeklyFragments)} из 5 фрагментов`}>{Array.from({length:5},(_,index)=><i className={index<weeklyFragments?"filled":""} key={index}>★</i>)}<strong>{Math.min(5, weeklyFragments)}/5</strong></div></section>

      <section className="route-section">
        <div className="route-heading"><div><p>Маршрут на сегодня</p><h2>Миссии дня</h2></div><span>Можно идти в любом порядке · каждая попытка помогает двигаться дальше</span></div>
        <div className="route-grid">{missions.map((mission) => { const done = progress.done.includes(mission.id); const note = mission.id === "reading" ? `${readingBook.title} · чтение в своём темпе` : mission.note; return <article className={`route-card ${mission.accent} ${done ? "done" : ""}`} key={mission.id}><button className="route-main" onClick={() => goTo(mission.id)}><span className="mission-number">{mission.index}</span><span className="mission-symbol"><MissionIcon id={mission.id}/></span><span className="route-copy"><small>{mission.kicker}</small><strong>{mission.title}</strong><p>{note}</p></span><span className="reward-pill">{done ? "Готово" : mission.reward}</span></button></article>; })}</div>
      </section>

      <section className="bottom-cards">
        <button id="journal-anchor" className="journal-card" onClick={() => goTo("journal")}><span>Личное пространство</span><strong>Мой день</strong><p>Что получилось, что было непросто и что рассказать папе.</p><i>Открыть дневник <b>→</b></i></button>
        <button id="parent-anchor" className={`parent-card ${closed ? "closed" : ""}`} onClick={() => goTo("parent")}><span>Для мамы</span><strong>{closed ? "День подтверждён" : "Мамина проверка"}</strong><p>{closed ? "Все результаты сохранены. День можно открыть для исправления." : "Мама подтверждает бытовые миссии и подписывает отчёт дня."}</p><i>{closed ? `${earnedStars}/10 ⭐ · ${tomorrowLimit} ₽ завтра` : "Перейти к маминой проверке →"}</i></button>
      </section>

      {bottomNav}
    </main>
  );
}

function BottomNav({ active, onOpen }: { active: NavSection; onOpen: (section: NavSection) => void }) {
  return <nav className="mobile-nav" aria-label="Основные разделы"><button className={active==="today"?"active":""} onClick={() => onOpen("today")}><NavIcon name="home"/><span>Сегодня</span></button><button className={active==="wallet"?"active":""} onClick={() => onOpen("wallet")}><NavIcon name="wallet"/><span>Копилка</span></button><button className={active==="journal"?"active":""} onClick={() => onOpen("journal")}><NavIcon name="journal"/><span>Мой день</span></button><button className={active==="parent"?"active":""} onClick={() => onOpen("parent")}><NavIcon name="parent"/><span>Маме</span></button></nav>;
}

function DayLockedBanner({ onUnlock }: { onUnlock: () => void }) {
  return <div className="day-locked" role="status"><div><strong>День уже подтверждён</strong><span>Чтобы изменить ответы или задание, сначала открой день.</span></div><button onClick={onUnlock}>Открыть для исправления</button></div>;
}

function MissionIcon({ id }: { id: MissionId }) {
  return <img src={`/icon-${id}-v1.webp`} alt="" aria-hidden="true" />;
}

function NavIcon({ name }: { name: "home" | "wallet" | "journal" | "parent" }) {
  if (name === "home") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z"/></svg>;
  if (name === "wallet") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v4H6.5a2.5 2.5 0 0 1 0-5M4 6.5V18a2 2 0 0 0 2 2h14V8H6.5M16 13h4v4h-4a2 2 0 0 1 0-4Z"/></svg>;
  if (name === "journal") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5Zm0 0v17M9 7h6m-6 4h7"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-1a3 3 0 1 0 0-6m-7.5 9C5 12 3 14.2 3 18v2h11v-2c0-3.8-2-6-5.5-6Zm7 0c3.5 0 5.5 2.2 5.5 6v2h-5"/></svg>;
}

function MoodIcon({ mood }: { mood: typeof moods[number]["id"] }) {
  const eye = { fill: "none", stroke: "#45351d", strokeWidth: 2.2, strokeLinecap: "round" as const };
  return <svg className={`mood-icon mood-${mood}`} viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id={`mood-${mood}-fill`} x1="10" y1="7" x2="38" y2="42"><stop stopColor="#fff2a7"/><stop offset="1" stopColor="#ffc84d"/></linearGradient></defs>
    <circle cx="24" cy="24" r="18" fill={`url(#mood-${mood}-fill)`}/><ellipse cx="18" cy="15" rx="7" ry="4" fill="#fff" opacity=".38"/>
    {mood === "joy" && <><path {...eye} d="M15 21c1.4-2.3 4.1-2.3 5.5 0M27.5 21c1.4-2.3 4.1-2.3 5.5 0"/><path {...eye} d="M15.5 28c2.1 5.3 14.9 5.3 17 0"/></>}
    {mood === "calm" && <><path {...eye} d="M14.5 22c2.1 1.7 4.4 1.7 6.5 0M27 22c2.1 1.7 4.4 1.7 6.5 0"/><path {...eye} d="M18 30c3.8 2 8.2 2 12 0"/></>}
    {mood === "okay" && <><circle cx="18" cy="22" r="1.8" fill="#45351d"/><circle cx="30" cy="22" r="1.8" fill="#45351d"/><path {...eye} d="M18.5 30h11"/></>}
    {mood === "sad" && <><path {...eye} d="m15 22 5-1M28 21l5 1"/><path {...eye} d="M17.5 32c3.8-3.3 9.2-3.3 13 0"/><path d="M34 26c3 3.2 2.7 5.6.2 6.8-2.5-1.2-2.8-3.6-.2-6.8Z" fill="#63b7ff"/></>}
    {mood === "tired" && <><path {...eye} d="M14.5 22h6M27.5 22h6M19 30c3.2-1 6.8-1 10 0"/><path d="M34 10h6l-6 7h6" fill="none" stroke="#6c75d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>}
  </svg>;
}

function ContactIcon() { return <img src="/icon-contact-v1.webp" alt="" aria-hidden="true"/>; }
function ContactMark({ kind }: { kind: "vk" | "max" }) { return <span className={`contact-mark ${kind}`} aria-hidden="true">{kind === "vk" ? "VK" : "MAX"}</span>; }

function ActivityHeader({ mission, onBack, done }: { mission: Mission; onBack: () => void; done: boolean }) {
  return <header className={`activity-header ${done ? "mission-complete" : ""}`}><button onClick={onBack} aria-label="Вернуться к маршруту">←</button><span className="screen-icon mission"><MissionIcon id={mission.id}/></span><div><span>{mission.kicker}</span><strong>{mission.title}</strong></div><b>{done ? "Готово" : mission.reward}</b></header>;
}
function Intro({ title, text }: { title: string; text: string }) { return <div className="activity-intro"><h1>{title}</h1><p>{text}</p></div>; }
function CheckList({ items, selected, onToggle }: { items: string[][]; selected: string[]; onToggle: (id: string) => void }) { return <div className="check-list">{items.map(([id,label],index)=><button className={selected.includes(id)?"checked":""} onClick={()=>onToggle(id)} key={id}><span>{selected.includes(id)?"✓":index+1}</span><strong>{label}</strong></button>)}</div>; }
function ChoiceList({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (value: string) => void }) { return <div className="choice-list">{options.map((option,index)=><button className={selected===option?"selected":""} onClick={()=>onSelect(option)} key={option}><span>{String.fromCharCode(65+index)}</span><strong>{option}</strong><i>{selected===option?"✓":""}</i></button>)}</div>; }
function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) { return <button className="primary-action" disabled={disabled} onClick={onClick}>{children}</button>; }
function Feedback({ children }: { children: React.ReactNode }) { return <div className="feedback">{children}</div>; }
function Celebration({ event }: { event: CelebrationEvent }) {
  return <div className={`celebration celebration-${event.id}`} role="status" aria-live="polite">
    <div className="celebration-aurora"/>
    <div className="celebration-rings"><i/><i/><i/></div>
    <div className="confetti-field">{Array.from({length:18},(_,index)=><i key={index}/>)}</div>
    <div className="celebration-panel">
      <div className="reward-emblem"><MissionIcon id={event.id}/><span className="reward-star"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 2.8 4 8.1 9 1.3-6.5 6.3 1.5 8.9-8-4.2-8 4.2 1.5-8.9L3 12.2l9-1.3Z"/></svg></span></div>
      <span className="celebration-kicker">Миссия выполнена</span>
      <strong>{event.text}</strong>
      <div className="reward-count"><b>+{event.stars}</b><span>{event.stars === 1 ? "звезда" : event.stars < 5 ? "звезды" : "звёзд"}</span></div>
      <p><i/> Прогресс сохранён</p>
    </div>
  </div>;
}

function ScreenTop({ title, subtitle, onBack, icon }: { title: string; subtitle: string; onBack: () => void; icon?: "wallet" | "journal" | "parent" }) { return <header className="screen-top"><button onClick={onBack}>←</button>{icon && <span className={`screen-icon ${icon}`}><NavIcon name={icon}/></span>}<div><strong>{title}</strong><span>{subtitle}</span></div></header>; }
function WalletScreen({ progress, patch, todayLimit, tomorrowLimit, rewardBudget, closed, onUnlock, onBack }: { progress: Progress; patch: (next: Partial<Progress>) => void; todayLimit: number; tomorrowLimit: number; rewardBudget: number; closed: boolean; onUnlock: () => void; onBack: () => void }) {
  const left = Math.max(0, progress.goalAmount - progress.balance);
  const percent = progress.goalAmount ? Math.min(100, Math.round(progress.balance / progress.goalAmount * 100)) : 0;
  const [editingGoal, setEditingGoal] = useState(!progress.goalTitle || !progress.goalAmount);
  const maxTransfer = Math.floor(rewardBudget / 10) * 10;
  const transfer = Math.min(maxTransfer, progress.savingsTransfer);
  const spendingPart = rewardBudget - transfer;
  return <main className={`plain-screen ${closed ? "screen-locked" : ""}`}><ScreenTop title="Моя копилка" subtitle="Ты решаешь, куда направить награду" onBack={onBack}/>{closed && <DayLockedBanner onUnlock={onUnlock}/>}<section className="wallet-hero"><span>На банковском счёте</span><strong>{progress.balance.toLocaleString("ru-RU")} ₽</strong><p>Сегодня можно потратить до {todayLimit} ₽. Новая награда распределяется отдельно и подтвердится мамой.</p></section><section className="allocation-panel"><div className="allocation-heading"><div><span>Награда за сегодня</span><h2>Распредели {rewardBudget} ₽</h2><p>Выбери сумму для копилки шагом 10 ₽. Остальное увеличит лимит на завтра.</p></div><b>{closed ? "Подтверждено" : "Можно менять"}</b></div><div className="allocation-result"><article><span>На траты завтра</span><strong>{spendingPart} ₽</strong><small>Лимит станет {tomorrowLimit} ₽</small></article><article><span>В копилку</span><strong>{transfer} ₽</strong><small>Счёт станет {(progress.balance + (progress.savingsApplied ? 0 : transfer)).toLocaleString("ru-RU")} ₽</small></article></div><label className="allocation-control"><span>Перевести в копилку</span><div><button disabled={closed || transfer <= 0} onClick={()=>patch({savingsTransfer:Math.max(0,transfer-10)})}>−</button><output>{transfer} ₽</output><button disabled={closed || transfer >= maxTransfer} onClick={()=>patch({savingsTransfer:Math.min(maxTransfer,transfer+10)})}>+</button></div><input aria-label="Сумма в копилку" type="range" min="0" max={maxTransfer || 0} step="10" disabled={closed || maxTransfer === 0} value={transfer} onChange={e=>patch({savingsTransfer:Number(e.target.value)})}/></label>{rewardBudget % 10 !== 0 && <small className="allocation-note">Остаток {rewardBudget % 10} ₽ автоматически идёт в лимит на завтра.</small>}</section><section className="goal-panel"><div className="goal-title-row"><div><span>Моя цель</span><strong>{progress.goalTitle || "Выбери, на что копить"}</strong><small>{progress.goalAmount ? `Осталось накопить ${left.toLocaleString("ru-RU")} ₽` : "Придумай цель и укажи её стоимость"}</small></div><b>{percent}%</b></div><div className="goal-line"><i style={{width:`${percent}%`}}/></div><button className="goal-edit-button" onClick={() => setEditingGoal((value) => !value)}>{editingGoal ? "Свернуть настройку" : progress.goalTitle ? "Изменить цель" : "Выбрать цель"}<span>→</span></button>{editingGoal && <div className="goal-editor"><label><span>Что ты хочешь?</span><input value={progress.goalTitle} onChange={e=>patch({goalTitle:e.target.value})} placeholder="Например, ролики"/></label><label><span>Сколько это стоит?</span><input type="number" inputMode="numeric" value={progress.goalAmount || ""} onChange={e=>patch({goalAmount:clampMoney(Number(e.target.value))})} placeholder="5000 ₽"/></label><p>Можно выбрать самой, а потом обсудить с мамой или папой.</p></div>}</section></main>;
}

const moods = [{id:"joy",label:"Радостно"},{id:"calm",label:"Спокойно"},{id:"okay",label:"Обычно"},{id:"sad",label:"Грустно"},{id:"tired",label:"Устала"}] as const;

function JournalScreen({ day, progress, patch, history, historyLoading, dadContacts, closed, onUnlock, onNotifyDad, onBack }: { day: string; progress: Progress; patch: (next: Partial<Progress>) => void; history: HistoryDay[]; historyLoading: boolean; dadContacts: DadContacts | null; closed: boolean; onUnlock: () => void; onNotifyDad: (note: string) => Promise<boolean>; onBack: () => void }) {
  const [selectedDay, setSelectedDay] = useState(day);
  const [notifyState, setNotifyState] = useState<"idle" | "sending" | "sent" | "setup" | "error">("idle");
  const selectedRecord = history.find((item) => item.day === selectedDay);
  const shown = selectedDay === day ? progress : { ...emptyProgress, ...(selectedRecord?.progress ?? {}) };
  const isToday = selectedDay === day;
  async function sendNote() {
    if (!shown.dadNote.trim()) return;
    setNotifyState("sending");
    try { setNotifyState(await onNotifyDad(shown.dadNote.trim()) ? "sent" : "setup"); }
    catch { setNotifyState("error"); }
  }
  return <main className={`plain-screen ${closed && isToday ? "screen-locked" : ""}`}>
    <ScreenTop title="Мой день" subtitle={isToday ? "Мысли, настроение и маленькие победы" : dayLabel(selectedDay)} icon="journal" onBack={onBack}/>
    {closed && isToday && <DayLockedBanner onUnlock={onUnlock}/>} 
    <section className="journal-history"><div className="history-heading"><div><span>Дневник Василисы</span><h2>История дней</h2></div><small>{historyLoading ? "Загружаю…" : `${Math.max(history.length, 1)} дней сохранено`}</small></div><div className="history-strip"><button className={isToday ? "selected" : ""} onClick={() => setSelectedDay(day)}><b>Сегодня</b><span>{new Date(`${day}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span></button>{history.filter((item) => item.day !== day).slice(0, 30).map((item) => <button className={selectedDay === item.day ? "selected" : ""} onClick={() => setSelectedDay(item.day)} key={item.day}><b>{new Date(`${item.day}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "short" })}</b><span>{new Date(`${item.day}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span><i>{item.stars} ⭐</i></button>)}</div></section>
    <section className={`journal-sheet ${isToday ? "" : "history-view"}`}><div className="journal-title"><span className="journal-emblem"><NavIcon name="journal"/></span><div><small>{isToday ? "Сегодня" : "Запись из истории"}</small><h1>{isToday ? "Как ты сегодня?" : dayLabel(selectedDay)}</h1></div></div><div className="mood-row">{moods.map(mood=><button disabled={!isToday} aria-pressed={shown.mood===mood.id} aria-label={mood.label} title={mood.label} className={shown.mood===mood.id?"selected":""} onClick={()=>patch({mood:mood.id})} key={mood.id}><MoodIcon mood={mood.id}/><span>{mood.label}</span></button>)}</div>{isToday ? <><label><span>Что сегодня получилось?</span><textarea value={shown.goodThing} onChange={e=>patch({goodThing:e.target.value})} placeholder="Даже маленькая победа считается"/></label><label><span>Что сегодня было непросто?</span><textarea value={shown.hardThing} onChange={e=>patch({hardThing:e.target.value})} placeholder="Можно записать то, что хочется попробовать по-другому"/></label><label><span>Есть чем поделиться с папой?</span><textarea value={shown.dadNote} onChange={e=>{patch({dadNote:e.target.value});setNotifyState("idle");}} placeholder="Напиши просьбу, новость или просто важную мысль"/></label><button className="dad-notify-button" disabled={!shown.dadNote.trim() || notifyState === "sending" || shown.dadNotifiedText === shown.dadNote.trim()} onClick={sendNote}><ContactMark kind="vk"/><span><b>{notifyState === "sending" ? "Отправляю…" : shown.dadNotifiedText === shown.dadNote.trim() || notifyState === "sent" ? "Папа получил сообщение" : "Поделиться с папой"}</b><small>{notifyState === "setup" ? "Записано. Уведомления VK нужно один раз подключить" : notifyState === "error" ? "Не отправилось — попробуй ещё раз" : "Уведомление придёт папе сразу"}</small></span></button><DadContact contacts={dadContacts}/><button className="primary-action" onClick={onBack}>Сохранить мой день</button></> : <div className="history-sections"><HistoryBlock icon="✓" title="Что получилось" text={shown.goodThing}/><HistoryBlock icon="↗" title="Что было непросто" text={shown.hardThing}/><HistoryBlock icon="♥" title="Просьбы и сообщения папе" text={shown.dadNote}/><div className="history-summary"><span>{selectedRecord?.stars ?? 0} ⭐</span><span>{selectedRecord?.closed ? "Подтверждено мамой" : "День не закрыт"}</span></div></div>}</section>
  </main>;
}

function HistoryBlock({ icon, title, text }: { icon: string; title: string; text: string }) { return <article><span>{icon}</span><div><strong>{title}</strong><p>{text.trim() || "В этот день записи не было"}</p></div></article>; }
function DadContact({ contacts }: { contacts: DadContacts | null }) {
  return <section className="dad-contact"><div className="dad-contact-copy"><span className="dad-avatar">П</span><div><strong>Папа на связи</strong><span>{contacts ? "Можно позвонить или написать" : "Контакты доступны после настройки сервера"}</span></div></div>{contacts && <div className="dad-contact-actions"><a className="phone" href={`tel:${contacts.phone}`} aria-label="Позвонить папе"><ContactIcon/><span><b>Позвонить</b><small>сразу по телефону</small></span></a><a className="vk" href={contacts.vkUrl} target="_blank" rel="noreferrer" aria-label="Написать папе во ВКонтакте"><ContactMark kind="vk"/><span><b>ВКонтакте</b><small>личные сообщения</small></span></a><a className="max" href={contacts.maxUrl} target="_blank" rel="noreferrer" aria-label="Написать папе в MAX"><ContactMark kind="max"/><span><b>MAX</b><small>открыть приложение</small></span></a></div>}</section>;
}

function ParentScreen({ day, progress, patch, closed, onCloseDay, onReopenDay, stars, tomorrowLimit, rewardBudget, onBack, onOpenMission, onOpenWallet }: { day: string; progress: Progress; patch: (next: Partial<Progress>) => void; closed: boolean; onCloseDay: (signature: string) => void; onReopenDay: () => void; stars: number; tomorrowLimit: number; rewardBudget: number; onBack: () => void; onOpenMission: (id: MissionId) => void; onOpenWallet: () => void }) {
  const baseWithoutReserve = stars - (progress.reserveStar ? 1 : 0);
  const bookReflections = BOOKS.flatMap((book) => {
    const reflection = progress.bookReflections?.[book.id];
    return reflection?.savedAt ? [{ book, reflection }] : [];
  });
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "building" | "error">("idle");
  const transfer = Math.min(Math.floor(rewardBudget / 10) * 10, progress.savingsTransfer);
  const confirm = () => { if (progress.motherSignature) onCloseDay(progress.motherSignature); else setSignatureOpen(true); };
  async function makePdf() {
    setPdfState("building");
    try { await downloadDayPdf({ day, progress, stars, tomorrowLimit, rewardBudget }); setPdfState("idle"); }
    catch { setPdfState("error"); }
  }
  return <main className="plain-screen parent-screen">
    <ScreenTop title="Мамина проверка" subtitle="Мамин раздел" icon="parent" onBack={onBack}/>
    <section className="parent-summary"><div><span>Итог Василисы</span><strong>{stars}/10 ⭐</strong></div><div><span>Лимит завтра</span><strong>{tomorrowLimit} ₽</strong></div></section>
    {bookReflections.length > 0 && <section className="parent-book-reflections"><div className="panel-title"><span className="panel-emblem bonus">★</span><div><small>Чтение без оценок</small><h2>Книжные заметки Василисы</h2></div></div>{bookReflections.map(({ book, reflection }) => <article key={book.id}><div><strong>{book.title}</strong><span>Папин персональный бонус · +{reflection.bonusStars} ⭐</span></div><p>{reflection.text}</p></article>)}</section>}
    <section className="review-panel"><div className="panel-title"><span className="panel-emblem">✓</span><div><small>Маршрут дня</small><h2>Что отмечено сегодня</h2></div></div><p className="review-hint">Нажмите на невыполненное задание, чтобы сразу открыть его.</p>{missions.map(m => { const done = progress.done.includes(m.id); return <button className={done ? "completed" : "needs-action"} disabled={done || closed} onClick={() => onOpenMission(m.id)} key={m.id}><span>{done ? "✓" : ""}</span><strong>{m.title}</strong><small>{done ? "выполнено" : "Открыть →"}</small></button>; })}</section>
    <section className="parent-settings"><div className="panel-title compact"><span className="panel-emblem bonus">★</span><div><small>Бонус</small><h2>Запасная звезда</h2></div></div><label className={(baseWithoutReserve === 9 && !closed) ? "" : "disabled"}><input type="checkbox" disabled={baseWithoutReserve !== 9 || closed} checked={progress.reserveStar} onChange={e => patch({ reserveStar: e.target.checked })}/><span><strong>Заменить одну пропущенную миссию</strong><small>Доступно только при результате 9/10. Выше 10/10 итог не поднимется.</small></span></label></section>
    <button className="money-review-link" onClick={onOpenWallet}><span className="screen-icon wallet"><NavIcon name="wallet"/></span><div><small>Распределение награды</small><strong>Траты и копилка</strong><p>{tomorrowLimit} ₽ завтра · +{transfer} ₽ на банковский счёт</p></div><b>Открыть →</b></button>
    <section className={`signature-card ${progress.motherSignature ? "signed" : ""}`}><div><span>Подпись мамы</span><h2>{progress.motherSignature ? "День проверен" : "Нужна перед закрытием дня"}</h2><p>{progress.motherSignature ? "Мамина подпись сохранена вместе с итогом дня." : "Нажмите кнопку — откроется большое поле, где мама сможет расписаться пальцем."}</p></div>{progress.motherSignature && <img src={progress.motherSignature} alt="Сохранённая подпись мамы"/>}<button disabled={closed} onClick={() => setSignatureOpen(true)}>{progress.motherSignature ? "Подписать заново" : "Маме расписаться"}</button></section>
    <button className={`close-day ${closed ? "reopen" : ""}`} onClick={closed ? onReopenDay : confirm}>{closed ? "Открыть день для исправления" : "Подтвердить и закрыть день"}</button>
    {closed && progress.motherSignature && <section className="pdf-report-card"><span className="pdf-emblem">PDF</span><div><strong>Мамин отчёт готов</strong><p>Современный дневник приключений с маминой подписью и синей печатью.</p></div><button onClick={makePdf} disabled={pdfState === "building"}>{pdfState === "building" ? "Собираю…" : "Скачать красивый PDF"}</button>{pdfState === "error" && <small>Не получилось собрать файл. Попробуйте ещё раз.</small>}</section>}
    <p className="parent-note">После закрытия задания нельзя менять, выбранная сумма попадёт в копилку, а новый лимит откроется завтра.</p>
    {signatureOpen && <SignatureModal initial={progress.motherSignature} onCancel={() => setSignatureOpen(false)} onSave={(signature) => { patch({ motherSignature: signature, signedAt: new Date().toISOString() }); setSignatureOpen(false); }}/>} 
  </main>;
}

function approvalSealSvg() {
  return `<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <circle cx="70" cy="70" r="62" fill="#F4F8FF" stroke="#2F6DCC" stroke-width="4"/>
    <circle cx="70" cy="70" r="53" fill="none" stroke="#2F6DCC" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="70" y="31" text-anchor="middle" font-family="Roboto" font-size="10" font-weight="700" fill="#2F6DCC">МАМА ПРОВЕРИЛА</text>
    <text x="70" y="45" text-anchor="middle" font-family="Roboto" font-size="6" font-weight="700" letter-spacing="1" fill="#5C8BD8">ИГРОВАЯ ПЕЧАТЬ</text>
    <ellipse cx="70" cy="79" rx="18" ry="15" fill="#2F6DCC"/>
    <ellipse cx="51" cy="62" rx="7" ry="9" transform="rotate(-28 51 62)" fill="#2F6DCC"/>
    <ellipse cx="63" cy="55" rx="7" ry="9" transform="rotate(-8 63 55)" fill="#2F6DCC"/>
    <ellipse cx="77" cy="55" rx="7" ry="9" transform="rotate(8 77 55)" fill="#2F6DCC"/>
    <ellipse cx="89" cy="62" rx="7" ry="9" transform="rotate(28 89 62)" fill="#2F6DCC"/>
    <text x="70" y="113" text-anchor="middle" font-family="Roboto" font-size="10" font-weight="700" fill="#2F6DCC">ТЫ УМНИЦА!</text>
  </svg>`;
}

export function buildDayPdfDefinition({ day, progress, stars, tomorrowLimit, rewardBudget }: { day: string; progress: Progress; stars: number; tomorrowLimit: number; rewardBudget: number }) {
  const reportContent = dailyContent(day);
  const mathQuestions = reportContent.math;
  const englishQuestions = reportContent.english;
  const orderItems = reportContent.order.map((label, index) => [`daily-${index}`, label]);
  const selectedLabels = (items: string[][], selected: string[]) => items.filter(([id]) => selected.includes(id)).map(([, label]) => label).join("; ") || "Пока без отметок";
  const answerLine = (questions: { label: string }[], answers: string[]) => questions.map((question, index) => `${index + 1}. ${question.label}: ${answers[index] || "нет ответа"}`).join("\n");
  const missionColors = ["#FFD56A", "#67D5BD", "#71A9FF", "#FF8F98", "#FFBD68", "#E98BB9", "#A98AF8"];
  const missionKinds = ["СТАРТ", "КНИГА", "МАТЕМАТИКА", "ENGLISH", "ПОРЯДОК", "ДОБРО", "САМА"];
  const missionDetails: Record<MissionId, string> = {
    morning: selectedLabels(morningItems, progress.morningChecks),
    reading: `Чтение ${progress.readingMinutes} минут · страницы ${progress.readingStart || "-"}-${progress.readingEnd || "-"}`,
    math: `Ответы: ${progress.mathAnswers.filter(Boolean).length} из ${mathQuestions.length} · попыток ${progress.mathAttempts}`,
    english: `Ответы: ${progress.englishAnswers.filter(Boolean).length} из ${englishQuestions.length} · попыток ${progress.englishAttempts}`,
    order: selectedLabels(orderItems, progress.orderChecks),
    kindness: `${progress.kindnessChoice || "Пока не выбрано"}${progress.kindnessNote ? `. ${progress.kindnessNote}` : ""}`,
    independence: progress.independenceChoice || "Пока не выбрано",
  };
  const missionContent: Content[] = missions.map((mission, index) => {
    const complete = progress.done.includes(mission.id);
    return {
      margin: [0, 0, 0, 7],
      unbreakable: true,
      table: {
        widths: [7, 38, "*", 64],
        body: [[
          { text: "", fillColor: missionColors[index] },
          { stack: [{ text: String(index + 1).padStart(2, "0"), style: "step" }, { text: missionKinds[index], style: "missionKind" }], fillColor: "#FFFFFF" },
          { stack: [{ text: mission.title, style: "missionTitle" }, { text: missionDetails[mission.id], style: "detail" }], fillColor: "#FFFFFF" },
          { text: complete ? "ГОТОВО" : "ВПЕРЕДИ", style: complete ? "done" : "missed", alignment: "center", fillColor: complete ? "#E9FBF4" : "#FFF2EC" },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 8, paddingBottom: () => 8 },
    };
  });
  const checkedAt = progress.signedAt ? new Date(progress.signedAt).toLocaleString("ru-RU", { timeZone: APP_TIME_ZONE, dateStyle: "long", timeStyle: "short" }) : dayLabel(day);
  const signatureDate = progress.signedAt ? new Date(progress.signedAt).toLocaleDateString("ru-RU", { timeZone: APP_TIME_ZONE }) : new Date(`${day}T12:00:00`).toLocaleDateString("ru-RU");
  const progressDots = Array.from({ length: 10 }, (_, index) => ({ type: "ellipse" as const, x: 4 + index * 12, y: 6, r1: 3.6, r2: 3.6, color: index < stars ? "#FFB12A" : "#DDE3F2" }));
  const motivation = stars >= 8 ? "Ты сегодня сияла особенно ярко!" : stars >= 5 ? "Шаг за шагом ты становишься увереннее!" : "Каждая попытка - это новый шаг вперёд!";
  const signatureContent: Content[] = progress.motherSignature
    ? [{ image: progress.motherSignature, width: 145, height: 46, fit: [145, 46], alignment: "center", margin: [0, 7, 0, 0] }]
    : [{ text: "", margin: [0, 35, 0, 0] }];
  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [34, 34, 34, 54],
    info: { title: `Дневник приключений Василисы за ${day}` },
    background: (currentPage) => ({ canvas: [
      { type: "rect", x: 0, y: 0, w: 595, h: 842, color: "#FFF9F3" },
      { type: "ellipse", x: 565, y: 46, r1: 96, r2: 96, color: currentPage === 1 ? "#E8E7FF" : "#E4F7FF" },
      { type: "ellipse", x: 15, y: 815, r1: 88, r2: 88, color: currentPage === 1 ? "#FFF0C9" : "#FCE5F0" },
      { type: "ellipse", x: 520, y: 760, r1: 26, r2: 26, color: "#DFF7EF" },
    ] }),
    content: [
      { canvas: [
        { type: "rect", x: 0, y: 0, w: 423, h: 131, color: "#E9E7FF" },
        { type: "rect", x: 423, y: 0, w: 104, h: 131, color: "#FF7892" },
      ], margin: [0, 0, 0, 12] },
      { absolutePosition: { x: 52, y: 51 }, columns: [{ width: 330, stack: [
        { text: "ПРИКЛЮЧЕНИЯ ВАСИЛИСЫ", style: "eyebrow" },
        { text: "Мой день - моя история", style: "title", margin: [0, 8, 0, 5] },
        { text: "Карта маленьких побед, смелых попыток и добрых дел", style: "heroSubtitle" },
        { text: dayLabel(day), style: "date", margin: [0, 13, 0, 0] },
      ] }] },
      { absolutePosition: { x: 457, y: 53 }, columns: [{ width: 104, stack: [
        { text: "ЗВЁЗДЫ", style: "heroCaption", alignment: "center" },
        { text: `${stars}`, style: "heroScore", alignment: "center", margin: [0, 5, 0, 0] },
        { text: "из 10", style: "heroCaption", alignment: "center" },
        { text: stars >= 7 ? "СУПЕР ДЕНЬ" : "ДВИГАЕМСЯ ДАЛЬШЕ", style: "scoreNote", alignment: "center", margin: [0, 12, 0, 0] },
      ] }] },
      { table: { widths: ["*", "*", "*"], body: [[
        { stack: [{ text: "ЗВЁЗДНЫЙ СЛЕД", style: "statLabel" }, { canvas: progressDots, margin: [0, 7, 0, 6] }, { text: `${stars} из 10 собрано`, style: "statSmall" }], fillColor: "#FFF3C8" },
        { stack: [{ text: "НАГРАДА ДНЯ", style: "statLabel" }, { text: `${rewardBudget} ₽`, style: "statValue" }, { text: "за сегодняшний маршрут", style: "statSmall" }], fillColor: "#E6FAF3" },
        { stack: [{ text: "ЗАВТРА", style: "statLabel" }, { text: `${tomorrowLimit} ₽`, style: "statValue" }, { text: "откроется после проверки", style: "statSmall" }], fillColor: "#E8F1FF" },
      ]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 12, paddingBottom: () => 12 }, margin: [0, 0, 0, 17] },
      { columns: [{ text: "Маршрут дня", style: "sectionTitle" }, { text: "7 шагов большого приключения", style: "sectionHint", alignment: "right" }], margin: [0, 0, 0, 9] },
      ...missionContent,
      { text: "Мой волшебный день", style: "sectionTitle", pageBreak: "before", margin: [0, 0, 0, 9] },
      { table: { widths: [116, "*"], body: [
        [{ text: "НАСТРОЕНИЕ", style: "rowLabel", fillColor: "#EEEAFE" }, { text: moods.find((m) => m.id === progress.mood)?.label || "Пока не выбрано", style: "rowValue", fillColor: "#FAF9FF" }],
        [{ text: "МОЯ ПОБЕДА", style: "rowLabel", fillColor: "#E2F8F0" }, { text: progress.goodThing || "Нет записи", style: "rowValue", fillColor: "#F8FFFC" }],
        [{ text: "БЫЛО НЕПРОСТО", style: "rowLabel", fillColor: "#FFF0DB" }, { text: progress.hardThing || "Нет записи", style: "rowValue", fillColor: "#FFFCF8" }],
        [{ text: "ПАПЕ", style: "rowLabel", fillColor: "#E6F0FF" }, { text: progress.dadNote || "Нет записи", style: "rowValue", fillColor: "#F8FBFF" }],
      ] }, layout: { hLineWidth: () => 4, vLineWidth: () => 4, hLineColor: () => "#FFF9F3", vLineColor: () => "#FFF9F3", paddingLeft: () => 11, paddingRight: () => 11, paddingTop: () => 10, paddingBottom: () => 10 }, margin: [0, 0, 0, 15] },
      { columns: [
        { width: "*", stack: [{ text: "МАТЕМАТИКА", style: "studyLabel" }, { text: answerLine(mathQuestions, progress.mathAnswers), style: "studyText" }], margin: [0, 0, 7, 0], fillColor: "#F2F7FF" },
        { width: "*", stack: [{ text: "ENGLISH", style: "studyLabel" }, { text: answerLine(englishQuestions, progress.englishAnswers), style: "studyText" }], margin: [7, 0, 0, 0], fillColor: "#FFF1F3" },
      ], columnGap: 0, margin: [0, 0, 0, 16] },
      { unbreakable: true, table: { widths: ["*", 192], body: [[
        { stack: [
          { text: "МАМИНА ПРОВЕРКА", style: "approvalEyebrow" },
          { text: "День принят!", style: "approvalTitle", margin: [0, 7, 0, 5] },
          { text: motivation, style: "approvalText" },
          { text: `Мама проверила маршрут: ${checkedAt}`, style: "approvalMeta", margin: [0, 13, 0, 0] },
        ], fillColor: "#EAF2FF" },
        { stack: [
          { text: `Дата: ${signatureDate}`, style: "signatureDate", alignment: "center" },
          ...signatureContent,
          { canvas: [{ type: "line", x1: 14, y1: 0, x2: 158, y2: 0, lineWidth: 1.2, lineColor: "#4C68A8" }] },
          { text: "Подпись мамы", style: "signatureLabel", alignment: "center" },
          { svg: approvalSealSvg(), width: 88, alignment: "right", relativePosition: { x: 8, y: -79 }, margin: [0, 0, 0, -70] },
        ], fillColor: "#F7FAFF" },
      ]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 15, paddingRight: () => 15, paddingTop: () => 14, paddingBottom: () => 14 }, margin: [0, 0, 0, 0] },
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "ПРИКЛЮЧЕНИЯ ПРОДОЛЖАЮТСЯ", color: "#5D5FEF", bold: true, fontSize: 8 },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", color: "#8790A8", fontSize: 8 },
      ], margin: [34, 22, 34, 0],
    }),
    defaultStyle: { font: "Roboto", fontSize: 9.5, color: "#25304A", lineHeight: 1.2 },
    styles: {
      eyebrow: { fontSize: 8, bold: true, color: "#5D5FEF", characterSpacing: 1.5 }, title: { fontSize: 24, bold: true, color: "#29345B" }, heroSubtitle: { fontSize: 9.5, color: "#66708A" }, date: { fontSize: 10, bold: true, color: "#5D5FEF" }, heroScore: { fontSize: 34, bold: true, color: "#FFFFFF" }, heroCaption: { fontSize: 7, bold: true, color: "#FFE8EE", characterSpacing: 1 }, scoreNote: { fontSize: 6.5, bold: true, color: "#FFFFFF" },
      statLabel: { fontSize: 7, bold: true, color: "#66708A", characterSpacing: .7 }, statValue: { fontSize: 17, bold: true, color: "#25304A", margin: [0, 5, 0, 2] }, statSmall: { fontSize: 7.2, color: "#7B8499" }, sectionTitle: { fontSize: 16, bold: true, color: "#29345B" }, sectionHint: { fontSize: 8, color: "#7D87A1", margin: [0, 5, 0, 0] },
      step: { bold: true, fontSize: 14, color: "#29345B" }, missionKind: { bold: true, fontSize: 5.6, color: "#77819A", margin: [0, 2, 0, 0] }, missionTitle: { bold: true, fontSize: 10.5, color: "#29345B", margin: [0, 0, 0, 3] }, detail: { fontSize: 7.8, color: "#6F7890" }, done: { fontSize: 7, bold: true, color: "#26815B", margin: [0, 7, 0, 0] }, missed: { fontSize: 7, bold: true, color: "#B26448", margin: [0, 7, 0, 0] },
      rowLabel: { bold: true, fontSize: 7.5, color: "#56617D", characterSpacing: .4 }, rowValue: { fontSize: 8.7, color: "#303B56" }, studyLabel: { fontSize: 8, bold: true, color: "#4E5C83", margin: [12, 11, 12, 6] }, studyText: { fontSize: 7.2, color: "#606B84", margin: [12, 0, 12, 11], lineHeight: 1.15 },
      approvalEyebrow: { fontSize: 7, bold: true, color: "#2F6DCC", characterSpacing: 1.2 }, approvalTitle: { fontSize: 19, bold: true, color: "#273B70" }, approvalText: { fontSize: 10, bold: true, color: "#4A5F8F" }, approvalMeta: { fontSize: 7.8, color: "#6F7FA3" }, signatureDate: { fontSize: 8.5, bold: true, color: "#40557F" }, signatureLabel: { fontSize: 7.5, color: "#63759D", margin: [0, 3, 0, 0] },
    },
  };
  return definition;
}

async function downloadDayPdf(args: { day: string; progress: Progress; stars: number; tomorrowLimit: number; rewardBudget: number }) {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const fonts = (await import("pdfmake/build/vfs_fonts")).default as unknown as Record<string, string>;
  pdfMake.vfs = fonts;
  pdfMake.createPdf(buildDayPdfDefinition(args)).download(`vasilisa-${args.day}.pdf`);
}

function SignatureModal({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (value: string) => void }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const drawing=useRef(false);
  const hasInk=useRef(Boolean(initial));
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();const ratio=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
    const context=canvas.getContext("2d");if(!context)return;
    context.scale(ratio,ratio);context.lineCap="round";context.lineJoin="round";context.strokeStyle="#162235";context.lineWidth=3;
    if(initial){const image=new Image();image.onload=()=>context.drawImage(image,0,0,rect.width,rect.height);image.src=initial;}
  },[initial]);
  function point(event: React.PointerEvent<HTMLCanvasElement>){const rect=event.currentTarget.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
  function start(event: React.PointerEvent<HTMLCanvasElement>){drawing.current=true;hasInk.current=true;event.currentTarget.setPointerCapture(event.pointerId);const context=event.currentTarget.getContext("2d");const p=point(event);context?.beginPath();context?.moveTo(p.x,p.y);}
  function draw(event: React.PointerEvent<HTMLCanvasElement>){if(!drawing.current)return;const context=event.currentTarget.getContext("2d");const p=point(event);context?.lineTo(p.x,p.y);context?.stroke();}
  function stop(){drawing.current=false;}
  function clear(){const canvas=canvasRef.current;const context=canvas?.getContext("2d");if(canvas&&context){context.clearRect(0,0,canvas.width,canvas.height);hasInk.current=false;}}
  function save(){const canvas=canvasRef.current;if(canvas&&hasInk.current)onSave(canvas.toDataURL("image/png"));}
  return <div className="signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-title"><div className="signature-sheet"><div className="signature-modal-title"><div><span>Подтверждение мамы</span><h2 id="signature-title">Поставьте подпись пальцем</h2></div><button onClick={onCancel} aria-label="Закрыть">×</button></div><p>Расписывайтесь внутри светлого поля. Мамина подпись сохранится только для этого дня.</p><canvas aria-label="Поле для подписи мамы" ref={canvasRef} onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerCancel={stop}/><div className="signature-actions"><button onClick={clear}>Очистить</button><button className="save-signature" onClick={save}>Сохранить подпись</button></div></div></div>;
}
