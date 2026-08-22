"use client";

import { useEffect, useMemo, useState } from "react";

type MissionId = "morning" | "reading" | "math" | "english" | "order" | "kindness" | "independence";
type View = "home" | "wallet" | "journal" | "parent" | MissionId;
type NavSection = "today" | "wallet" | "journal" | "parent";
type CelebrationEvent = { id: MissionId; text: string; stars: number };
type Progress = {
  done: MissionId[];
  morningChecks: string[];
  readingStart: string;
  readingEnd: string;
  readingMinutes: number;
  readingAnswer: string;
  mathAnswers: string[];
  englishAnswers: string[];
  orderChecks: string[];
  kindnessChoice: string;
  kindnessNote: string;
  independenceChoice: string;
  mood: string;
  goodThing: string;
  hardThing: string;
  dadNote: string;
  balance: number;
  goalTitle: string;
  goalAmount: number;
  phone: string;
  reserveStar: boolean;
  decision: string;
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
  done: [], morningChecks: [], readingStart: "", readingEnd: "", readingMinutes: 15, readingAnswer: "",
  mathAnswers: ["", "", "", "", ""], englishAnswers: ["", "", "", "", "", ""], orderChecks: [],
  kindnessChoice: "", kindnessNote: "", independenceChoice: "", mood: "", goodThing: "", hardThing: "", dadNote: "",
  balance: 0, goalTitle: "", goalAmount: 0, phone: "", reserveStar: false, decision: "",
};

const morningItems = [
  ["wash", "Умылась и почистила зубы"],
  ["bed", "Заправила кровать"],
  ["breakfast", "Позавтракала и убрала за собой"],
  ["exercise", "Сделала зарядку 5 минут"],
];
const orderItems = [
  ["things", "Вернула на место минимум 5 вещей"],
  ["desk", "Освободила и протёрла свой стол"],
  ["clothes", "Подготовила одежду на завтра"],
  ["shoes", "Проверила, чистая ли обувь"],
];
const kindnessOptions = ["Помочь маме или сестре без просьбы", "Сказать кому-то доброе и конкретное слово", "Сделать маленькую заботу и не рассказывать сразу"];
const independenceOptions = ["Сама начала читать", "Сама навела порядок", "Сама подготовила вещи", "Сама вспомнила про важное дело"];
const mathQuestions = [
  { label: "8 × 7", answer: "56" }, { label: "54 ÷ 6", answer: "9" }, { label: "260 + 140", answer: "400" },
  { label: "500 − 120", answer: "380" }, { label: "Было 100 ₽. Потратила 45 ₽ и 35 ₽. Осталось?", answer: "20" },
];
const englishQuestions = [
  { icon: "📘", label: "книга", options: ["book", "room", "day"], answer: "book" },
  { icon: "🚪", label: "дверь", options: ["chair", "door", "shoes"], answer: "door" },
  { icon: "▦", label: "окно", options: ["window", "table", "help"], answer: "window" },
  { icon: "▰", label: "стол", options: ["chair", "table", "book"], answer: "table" },
  { icon: "♧", label: "стул", options: ["door", "chair", "day"], answer: "chair" },
  { icon: "I have a book.", label: "Выбери перевод", options: ["У меня есть книга.", "Я вижу дверь.", "Это моя комната."], answer: "У меня есть книга." },
];

function berlinDay() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date()); }
function dayLabel(day: string) { return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`)); }
function clampMoney(value: number) { return Math.max(0, Math.min(1_000_000, Math.round(value || 0))); }

export default function Adventure() {
  const [day] = useState(berlinDay);
  const [view, setView] = useState<View>("home");
  const [navSection, setNavSection] = useState<NavSection>("today");
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [todayLimit, setTodayLimit] = useState(100);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "offline">("saving");
  const [mathChecked, setMathChecked] = useState(false);
  const [englishChecked, setEnglishChecked] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);

  const readingStars = progress.done.includes("reading")
    ? progress.readingMinutes >= 25 && progress.readingAnswer.trim().length >= 8 ? 3 : progress.readingMinutes >= 20 ? 2 : 1
    : 0;
  const earnedStars = useMemo(() => {
    const fixed = progress.done.reduce((sum, id) => sum + (id === "math" ? 2 : id === "reading" ? 0 : 1), 0);
    return Math.min(10, fixed + readingStars + (progress.reserveStar && fixed + readingStars === 9 ? 1 : 0));
  }, [progress.done, progress.reserveStar, readingStars]);
  const tomorrowLimit = 100 + earnedStars * 15;
  const goalLeft = Math.max(0, progress.goalAmount - progress.balance);

  useEffect(() => {
    fetch(`/api/progress?day=${day}`).then(async (response) => {
      if (!response.ok) throw new Error("load");
      const data = await response.json() as { progress?: Partial<Progress>; closed?: boolean; todayLimit?: number };
      setProgress({ ...emptyProgress, ...(data.progress ?? {}), done: (data.progress?.done ?? []) as MissionId[] });
      setClosed(Boolean(data.closed)); setTodayLimit(Number(data.todayLimit) || 100); setSaveState("saved"); setLoaded(true);
    }).catch(() => { setLoaded(true); setSaveState("offline"); });
  }, [day]);

  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ day, progress, stars: earnedStars, closed }) })
        .then((response) => { if (!response.ok) throw new Error("save"); setSaveState("saved"); })
        .catch(() => setSaveState("offline"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [closed, day, earnedStars, loaded, progress]);

  function patch(next: Partial<Progress>) { if (!closed) setProgress((current) => ({ ...current, ...next })); }
  function toggleList(field: "morningChecks" | "orderChecks", id: string) {
    if (closed) return;
    setProgress((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((item) => item !== id) : [...current[field], id] }));
  }
  function setAnswer(field: "mathAnswers" | "englishAnswers", index: number, value: string) {
    if (closed) return;
    setProgress((current) => { const next = [...current[field]]; next[index] = value; return { ...current, [field]: next }; });
  }
  function complete(id: MissionId, message: string, stars = 1) {
    if (closed) return;
    setProgress((current) => ({ ...current, done: current.done.includes(id) ? current.done : [...current.done, id] }));
    setCelebration({ id, text: message, stars });
    navigator.vibrate?.([35, 30, 75]);
    window.setTimeout(() => { setCelebration(null); setView("home"); }, 2400);
  }
  function openSection(section: NavSection) {
    setNavSection(section);
    if (section === "today") {
      setView("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setView(section === "parent" ? "parent" : section);
  }

  const mathAllCorrect = mathQuestions.every((question, index) => progress.mathAnswers[index]?.trim() === question.answer);
  const englishAllCorrect = englishQuestions.every((question, index) => progress.englishAnswers[index] === question.answer);
  const readingReady = Boolean(progress.readingStart && progress.readingEnd && Number(progress.readingEnd) >= Number(progress.readingStart));
  const readingPotential = !readingReady ? 0 : progress.readingMinutes >= 25 && progress.readingAnswer.trim().length >= 8 ? 3 : progress.readingMinutes >= 20 ? 2 : 1;

  if (view !== "home" && view !== "wallet" && view !== "journal" && view !== "parent") {
    const mission = missions.find((item) => item.id === view)!;
    return (
      <main className={`activity-shell ${mission.accent}`}>
        <ActivityHeader mission={mission} onBack={() => setView("home")} done={progress.done.includes(mission.id)} />
        <section className="activity-card">
          {view === "morning" && <>
            <Intro title="Запусти день спокойно" text="Отмечай по одному пункту. За весь блок начисляется одна звезда — не за каждое действие отдельно." />
            <CheckList items={morningItems} selected={progress.morningChecks} onToggle={(id) => toggleList("morningChecks", id)} />
            <ActionButton disabled={progress.morningChecks.length !== morningItems.length} onClick={() => complete("morning", "Утренний запуск завершён")}>Завершить утренний запуск</ActionButton>
          </>}
          {view === "reading" && <>
            <Intro title="«Волшебник Изумрудного города»" text="Выбери уровень квеста. Чем внимательнее читаешь, тем больше звёзд можно открыть." />
            <div className="reading-levels">{[{m:15,s:1,t:"Разминка"},{m:20,s:2,t:"Исследователь"},{m:30,s:3,t:"Книжный герой"}].map((level) => <button key={level.m} className={progress.readingMinutes === level.m ? "selected" : ""} onClick={() => patch({ readingMinutes: level.m })}><strong>{level.m} минут</strong><span>{level.t}</span><b>{level.s} ⭐</b></button>)}</div>
            <div className="field-pair"><label><span>Начала со страницы</span><input inputMode="numeric" value={progress.readingStart} onChange={(e) => patch({ readingStart: e.target.value })} placeholder="например, 25" /></label><label><span>Закончила на странице</span><input inputMode="numeric" value={progress.readingEnd} onChange={(e) => patch({ readingEnd: e.target.value })} placeholder="например, 37" /></label></div>
            {progress.readingMinutes >= 25 && <label className="long-field"><span>Кого из героев ты взяла бы с собой в путешествие и почему?</span><textarea value={progress.readingAnswer} onChange={(e) => patch({ readingAnswer: e.target.value })} placeholder="Напиши 1–2 предложения своими словами" /></label>}
            <div className="live-result"><span>Сейчас открывается</span><strong>{readingPotential} из 3 ⭐</strong></div>
            <ActionButton disabled={!readingReady || (progress.readingMinutes >= 25 && progress.readingAnswer.trim().length < 8)} onClick={() => complete("reading", "Книжный портал открыт", readingPotential)}>Закрыть книжный квест</ActionButton>
          </>}
          {view === "math" && <>
            <Intro title="Введи код экспедиции" text="Реши пять заданий. Ошибка ничего не отнимает — можно исправлять сколько нужно." />
            <div className="math-list">{mathQuestions.map((question, index) => { const value = progress.mathAnswers[index] ?? ""; const ok = value.trim() === question.answer; return <label className={mathChecked ? ok ? "correct" : "wrong" : ""} key={question.label}><span><small>Задание {index + 1}</small>{question.label}</span><input inputMode="numeric" value={value} onChange={(e) => { setMathChecked(false); setAnswer("mathAnswers", index, e.target.value); }} placeholder="Ответ" />{mathChecked && <b>{ok ? "Верно" : "Проверь"}</b>}</label>; })}</div>
            {mathChecked && !mathAllCorrect && <Feedback>Не всё сошлось. Исправь отмеченные ответы — попытки не ограничены.</Feedback>}
            <ActionButton disabled={progress.mathAnswers.some((item) => !item)} onClick={() => { setMathChecked(true); if (mathAllCorrect) complete("math", "Шифр экспедиции разгадан", 2); }}>{mathChecked && mathAllCorrect ? "Шифр открыт!" : "Проверить ответы"}</ActionButton>
          </>}
          {view === "english" && <>
            <Intro title="Собери словарь разведчика" text="Нажми на правильное английское слово. В последнем задании выбери перевод фразы." />
            <div className="english-list">{englishQuestions.map((question, index) => { const chosen = progress.englishAnswers[index]; const ok = chosen === question.answer; return <article className={englishChecked ? ok ? "correct" : "wrong" : ""} key={question.label}><div className="word-prompt"><strong>{question.icon}</strong><span>{question.label}</span></div><div className="word-options">{question.options.map((option) => <button className={chosen === option ? "chosen" : ""} onClick={() => { setEnglishChecked(false); setAnswer("englishAnswers", index, option); }} key={option}>{option}</button>)}</div>{englishChecked && <small>{ok ? "Точно!" : "Попробуй другой вариант"}</small>}</article>; })}</div>
            {englishChecked && !englishAllCorrect && <Feedback>Есть неточности. Посмотри на подсказки и попробуй ещё раз.</Feedback>}
            <ActionButton disabled={progress.englishAnswers.some((item) => !item)} onClick={() => { setEnglishChecked(true); if (englishAllCorrect) complete("english", "English-разведка завершена"); }}>Проверить всю разведку</ActionButton>
          </>}
          {view === "order" && <>
            <Intro title="Порядок за пять минут" text="Поставь таймер и двигайся по списку. Важно не идеально, а самостоятельно довести небольшой участок до конца." />
            <div className="timer-card"><span>05:00</span><p>Включи обычный таймер на телефоне и начинай</p></div>
            <CheckList items={orderItems} selected={progress.orderChecks} onToggle={(id) => toggleList("orderChecks", id)} />
            <ActionButton disabled={progress.orderChecks.length < 3} onClick={() => complete("order", "Остров порядка готов")}>Порядок наведен</ActionButton>
          </>}
          {view === "kindness" && <>
            <Intro title="Добро не считается по кнопке" text="Выбери одно настоящее действие. Вечером мама просто подтвердит, что миссия состоялась." />
            <ChoiceList options={kindnessOptions} selected={progress.kindnessChoice} onSelect={(kindnessChoice) => patch({ kindnessChoice })} />
            <label className="long-field optional"><span>Что именно ты сделала? <em>необязательно</em></span><textarea value={progress.kindnessNote} onChange={(e) => patch({ kindnessNote: e.target.value })} placeholder="Можно оставить маленькую заметку" /></label>
            <ActionButton disabled={!progress.kindnessChoice} onClick={() => complete("kindness", "Добрая миссия выполнена")}>Миссия сделана</ActionButton>
          </>}
          {view === "independence" && <>
            <Intro title="Что получилось без напоминания?" text="Выбери только то, о чём сегодня действительно вспомнила сама. Эту звезду вечером подтверждает мама." />
            <ChoiceList options={independenceOptions} selected={progress.independenceChoice} onSelect={(independenceChoice) => patch({ independenceChoice })} />
            <ActionButton disabled={!progress.independenceChoice} onClick={() => complete("independence", "Суперспособность открыта")}>Я действительно сделала сама</ActionButton>
          </>}
        </section>
        {celebration && <Celebration event={celebration} />}
      </main>
    );
  }

  if (view === "wallet") return <WalletScreen progress={progress} patch={patch} todayLimit={todayLimit} tomorrowLimit={tomorrowLimit} onBack={() => setView("home")} />;
  if (view === "journal") return <JournalScreen progress={progress} patch={patch} onBack={() => setView("home")} />;
  if (view === "parent") return <ParentScreen progress={progress} patch={patch} closed={closed} setClosed={setClosed} stars={earnedStars} tomorrowLimit={tomorrowLimit} onBack={() => setView("home")} onOpenMission={(id) => setView(id)} />;

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="profile-dot" type="button" aria-label="Профиль Василисы">В</button>
        <div><strong>Приключения Василисы</strong><span>{dayLabel(day)}</span></div>
        <nav className="desktop-nav" aria-label="Разделы приложения"><button className={navSection==="today"?"active":""} onClick={() => openSection("today")}>Сегодня</button><button className={navSection==="wallet"?"active":""} onClick={() => openSection("wallet")}>Копилка</button><button className={navSection==="journal"?"active":""} onClick={() => openSection("journal")}>Мой день</button></nav>
        <div className={`sync-state ${saveState}`}>{saveState === "saved" ? "Сохранено" : saveState === "saving" ? "Сохраняю" : "Без связи"}</div>
      </header>

      <section className="game-hero" id="today-anchor">
        <div className="hero-content"><p className="hero-label">День 1 · Солнечная экспедиция</p><h1>Твой день.<br/>Твой маршрут.</h1><p>Семь коротких миссий для ума, характера и хорошего настроения. Начинай с любой.</p><div className="hero-actions"><button onClick={() => setView(missions.find((m) => !progress.done.includes(m.id))?.id ?? "journal")}>{earnedStars === 10 ? "Записать итог дня" : "Следующая миссия"}<span aria-hidden="true">→</span></button><div className="hero-progress"><b>{progress.done.length}/7</b><span>миссий готово</span></div></div></div>
        <picture className="hero-art">
          <source media="(max-width: 760px)" srcSet="/vasilisa-hero-cartoon-v4.webp" type="image/webp" />
          <img src="/hero-v2.png" alt="Мультяшная девочка с двумя косами держит светящуюся звезду" />
        </picture>
      </section>

      <section className="dashboard-strip" id="wallet-anchor">
        <button className="money-stat" onClick={() => setView("wallet")}><span>Можно сегодня</span><strong>{todayLimit} ₽</strong><small>В копилке {progress.balance.toLocaleString("ru-RU")} ₽ <b>→</b></small></button>
        <div className="star-summary"><span>Звёзды сегодня</span><strong>{earnedStars}<small> из 10</small></strong><div className="mini-stars">{Array.from({length:10},(_,i)=><i className={i<earnedStars?"filled":""} key={i} />)}</div></div>
        <div className="tomorrow-stat"><span>Откроется завтра</span><strong>{tomorrowLimit} ₽</strong><small>После проверки мамой</small></div>
      </section>

      <section className="route-section">
        <div className="route-heading"><div><p>Маршрут на сегодня</p><h2>Миссии дня</h2></div><span>Можно идти в любом порядке · ошибки не отнимают звёзды</span></div>
        <div className="route-grid">{missions.map((mission) => { const done = progress.done.includes(mission.id); return <article className={`route-card ${mission.accent} ${done ? "done" : ""}`} key={mission.id}><button className="route-main" onClick={() => setView(mission.id)}><span className="mission-number">{mission.index}</span><span className="mission-symbol"><MissionIcon id={mission.id}/></span><span className="route-copy"><small>{mission.kicker}</small><strong>{mission.title}</strong><p>{mission.note}</p></span><span className="reward-pill">{done ? "Готово" : mission.reward}</span></button></article>; })}</div>
      </section>

      <section className="bottom-cards">
        <button id="journal-anchor" className="journal-card" onClick={() => setView("journal")}><span>Личное пространство</span><strong>Мой день</strong><p>Что получилось, что было сложно и что рассказать папе.</p><i>Открыть дневник <b>→</b></i></button>
        <button id="parent-anchor" className={`parent-card ${closed ? "closed" : ""}`} onClick={() => setView("parent")}><span>Для взрослых</span><strong>{closed ? "День подтверждён" : "Проверка дня"}</strong><p>{closed ? "Все результаты сохранены. День можно открыть для исправления." : "Мама подтверждает бытовые миссии и закрывает день вечером."}</p><i>{closed ? `${earnedStars}/10 ⭐ · ${tomorrowLimit} ₽ завтра` : "Перейти к проверке →"}</i></button>
      </section>

      <nav className="mobile-nav" aria-label="Основные разделы"><button className={navSection==="today"?"active":""} onClick={() => openSection("today")}><NavIcon name="home"/><span>Сегодня</span></button><button className={navSection==="wallet"?"active":""} onClick={() => openSection("wallet")}><NavIcon name="wallet"/><span>Копилка</span></button><button className={navSection==="journal"?"active":""} onClick={() => openSection("journal")}><NavIcon name="journal"/><span>Мой день</span></button><button className={navSection==="parent"?"active":""} onClick={() => openSection("parent")}><NavIcon name="parent"/><span>Маме</span></button></nav>
    </main>
  );
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

function ActivityHeader({ mission, onBack, done }: { mission: Mission; onBack: () => void; done: boolean }) {
  return <header className="activity-header"><button onClick={onBack} aria-label="Вернуться к маршруту">←</button><div><span>{mission.kicker}</span><strong>{mission.title}</strong></div><b>{done ? "Готово" : mission.reward}</b></header>;
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

function ScreenTop({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) { return <header className="screen-top"><button onClick={onBack}>←</button><div><strong>{title}</strong><span>{subtitle}</span></div></header>; }
function WalletScreen({ progress, patch, todayLimit, tomorrowLimit, onBack }: { progress: Progress; patch: (next: Partial<Progress>) => void; todayLimit: number; tomorrowLimit: number; onBack: () => void }) {
  const left = Math.max(0, progress.goalAmount - progress.balance);
  const percent = progress.goalAmount ? Math.min(100, Math.round(progress.balance / progress.goalAmount * 100)) : 0;
  const [editingGoal, setEditingGoal] = useState(!progress.goalTitle || !progress.goalAmount);
  return <main className="plain-screen"><ScreenTop title="Моя копилка" subtitle="Деньги не сгорают" onBack={onBack}/><section className="wallet-hero"><span>Сейчас в копилке</span><strong>{progress.balance.toLocaleString("ru-RU")} ₽</strong><p>Сегодня можно потратить не больше {todayLimit} ₽. Завтра уже открыто {tomorrowLimit} ₽.</p></section><section className="goal-panel"><div className="goal-title-row"><div><span>Моя цель</span><strong>{progress.goalTitle || "Выбери, на что копить"}</strong><small>{progress.goalAmount ? `Осталось накопить ${left.toLocaleString("ru-RU")} ₽` : "Придумай цель и укажи её стоимость"}</small></div><b>{percent}%</b></div><div className="goal-line"><i style={{width:`${percent}%`}}/></div><button className="goal-edit-button" onClick={() => setEditingGoal((value) => !value)}>{editingGoal ? "Свернуть настройку" : progress.goalTitle ? "Изменить цель" : "Выбрать цель"}<span>→</span></button>{editingGoal && <div className="goal-editor"><label><span>Что ты хочешь?</span><input value={progress.goalTitle} onChange={e=>patch({goalTitle:e.target.value})} placeholder="Например, ролики"/></label><label><span>Сколько это стоит?</span><input type="number" inputMode="numeric" value={progress.goalAmount || ""} onChange={e=>patch({goalAmount:clampMoney(Number(e.target.value))})} placeholder="5000 ₽"/></label><p>Можно выбрать самой, а потом обсудить с мамой или папой.</p></div>}</section><section className="money-lesson"><span>Решение дня</span><h2>Хочу сейчас или коплю?</h2><p>Если потратить 120 ₽ сегодня, в копилке останется {Math.max(0,progress.balance-120).toLocaleString("ru-RU")} ₽. Если не тратить — цель станет ближе ещё на 120 ₽.</p><div><button className={progress.decision==="spend"?"selected":""} onClick={()=>patch({decision:"spend"})}>Потратить сегодня</button><button className={progress.decision==="save"?"selected":""} onClick={()=>patch({decision:"save"})}>Оставить в копилке</button></div>{progress.decision&&<strong className="decision-result">{progress.decision==="save"?"Решение сохранено: сегодня копим":"Решение сохранено: можно потратить"}</strong>}<small>Правильного ответа нет. Важно понимать последствия.</small></section></main>;
}

const moods = [{id:"joy",label:"Радостно"},{id:"calm",label:"Спокойно"},{id:"okay",label:"Обычно"},{id:"sad",label:"Грустно"},{id:"tired",label:"Устала"}] as const;

function JournalScreen({ progress, patch, onBack }: { progress: Progress; patch: (next: Partial<Progress>) => void; onBack: () => void }) { return <main className="plain-screen"><ScreenTop title="Мой день" subtitle="Здесь нет оценок и звёзд" onBack={onBack}/><section className="journal-sheet"><h1>Как ты сегодня?</h1><div className="mood-row">{moods.map(mood=><button aria-label={mood.label} title={mood.label} className={progress.mood===mood.id?"selected":""} onClick={()=>patch({mood:mood.id})} key={mood.id}><MoodIcon mood={mood.id}/><span>{mood.label}</span></button>)}</div><label><span>Что сегодня получилось?</span><textarea value={progress.goodThing} onChange={e=>patch({goodThing:e.target.value})} placeholder="Даже маленькая победа считается"/></label><label><span>Что было сложно?</span><textarea value={progress.hardThing} onChange={e=>patch({hardThing:e.target.value})} placeholder="Можно написать честно"/></label><label><span>Что хочешь рассказать папе?</span><textarea value={progress.dadNote} onChange={e=>patch({dadNote:e.target.value})} placeholder="Сообщение сохранится в истории дня"/></label><div className="dad-contact"><div><strong>Хочешь поговорить с папой?</strong><span>{progress.phone ? "Нажми — телефон сразу начнёт звонок" : "Номер добавляется в разделе «Маме»"}</span></div>{progress.phone ? <a href={`tel:${progress.phone}`}><ContactIcon/>Связаться с папой</a> : <button disabled><ContactIcon/>Связаться с папой</button>}</div><button className="primary-action" onClick={onBack}>Сохранить мой день</button></section></main>; }

function ParentScreen({ progress, patch, closed, setClosed, stars, tomorrowLimit, onBack, onOpenMission }: { progress: Progress; patch: (next: Partial<Progress>) => void; closed: boolean; setClosed: (value: boolean) => void; stars: number; tomorrowLimit: number; onBack: () => void; onOpenMission: (id: MissionId) => void }) { const baseWithoutReserve=stars-(progress.reserveStar?1:0); return <main className="plain-screen parent-screen"><ScreenTop title="Проверка дня" subtitle="Родительский режим" onBack={onBack}/><section className="parent-summary"><div><span>Итог Василисы</span><strong>{stars}/10 ⭐</strong></div><div><span>Лимит завтра</span><strong>{tomorrowLimit} ₽</strong></div></section><section className="review-panel"><h2>Что отмечено сегодня</h2><p className="review-hint">Нажмите на невыполненное задание, чтобы сразу открыть его.</p>{missions.map(m=>{const done=progress.done.includes(m.id);return <button className={done?"completed":"needs-action"} disabled={done||closed} onClick={()=>onOpenMission(m.id)} key={m.id}><span>{done?"✓":""}</span><strong>{m.title}</strong><small>{done?"выполнено":"Открыть →"}</small></button>})}</section><section className="parent-settings"><h2>Запасная звезда</h2><label className={(baseWithoutReserve===9&&!closed)?"":"disabled"}><input type="checkbox" disabled={baseWithoutReserve!==9||closed} checked={progress.reserveStar} onChange={e=>patch({reserveStar:e.target.checked})}/><span><strong>Заменить одну пропущенную миссию</strong><small>Доступно только при результате 9/10. Выше 10/10 итог не поднимется.</small></span></label></section><section className="parent-settings"><h2>Копилка и связь</h2><div className="parent-fields"><label><span>Баланс в Сбербанке, ₽</span><input type="number" disabled={closed} value={progress.balance||""} onChange={e=>patch({balance:clampMoney(Number(e.target.value))})}/></label><label><span>Телефон папы</span><input type="tel" disabled={closed} value={progress.phone} onChange={e=>patch({phone:e.target.value.replace(/[^+\d]/g,"").slice(0,16)})} placeholder="+7…"/></label></div></section><button className={`close-day ${closed?"reopen":""}`} onClick={()=>setClosed(!closed)}>{closed?"Открыть день для исправления":"Подтвердить и закрыть день"}</button><p className="parent-note">После закрытия ребёнок не сможет менять задания. Если отчёт не закрыт, следующий день начнётся с базовых 100 ₽.</p></main>; }
