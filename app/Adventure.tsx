"use client";

import { useMemo, useState } from "react";

type Mission = { id: string; icon: string; title: string; note: string; stars: number; color: string };

const missions: Mission[] = [
  { id: "morning", icon: "☀️", title: "Доброе утро", note: "Умойся, почисти зубы, позавтракай и заправь кровать", stars: 1, color: "sun" },
  { id: "reading", icon: "📖", title: "Книжный портал", note: "Читай «Волшебника Изумрудного города» 20 минут", stars: 2, color: "mint" },
  { id: "math", icon: "🔐", title: "Код от сундука", note: "Реши 4 коротких примера и открой секретный замок", stars: 2, color: "blue" },
  { id: "english", icon: "🦊", title: "English-разведка", note: "Найди правильные слова для четырёх картинок", stars: 1, color: "lilac" },
  { id: "order", icon: "✨", title: "Остров порядка", note: "Наведи порядок в своей зоне и проверь чистоту обуви", stars: 1, color: "peach" },
  { id: "kind", icon: "💌", title: "Тайная забота", note: "Сделай для кого-то дома одно доброе дело без просьбы", stars: 1, color: "pink" },
  { id: "self", icon: "🚀", title: "Сама вспомнила!", note: "Выполни любую миссию сегодня без напоминания", stars: 2, color: "violet" },
];

export default function Adventure() {
  const [done, setDone] = useState<string[]>([]);
  const [active, setActive] = useState<Mission | null>(null);
  const stars = useMemo(() => missions.filter((m) => done.includes(m.id)).reduce((sum, m) => sum + m.stars, 0), [done]);
  const tomorrow = 100 + stars * 15;

  function toggleMission(mission: Mission) {
    setDone((current) => current.includes(mission.id) ? current.filter((id) => id !== mission.id) : [...current, mission.id]);
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">В</div>
        <div><p className="eyebrow">Приключения Василисы</p><p className="tiny-date">Пятница, 21 августа</p></div>
        <button className="dad-button" type="button" aria-label="Позвать папу">☎ Папа</button>
      </header>

      <section className="hero-card">
        <div className="cloud cloud-one" /><div className="cloud cloud-two" />
        <div className="hero-copy">
          <span className="day-chip">День 9 · Спасательный патруль</span>
          <h1>Привет, Василиса!</h1>
          <p>Сегодня тебя ждут 7 миссий. Выбирай любую и собирай звёзды!</p>
          <div className="star-track" aria-label={`${stars} из 10 звёзд`}>
            {Array.from({ length: 10 }, (_, i) => <span className={i < stars ? "star earned" : "star"} key={i}>★</span>)}
          </div>
        </div>
        <div className="hero-world" aria-hidden="true"><div className="planet-ring" /><div className="mascot">🐝</div><div className="island island-back" /><div className="island island-front" /></div>
      </section>

      <section className="money-row" aria-label="Карманные деньги">
        <article className="money-card today-money"><span>Сегодня можно</span><strong>100 ₽</strong><small>Базовый лимит</small></article>
        <article className="money-card tomorrow-money"><span>Уже открыто на завтра</span><strong>{tomorrow} ₽</strong><small>{stars} из 10 звёзд</small></article>
        <article className="money-card goal-money"><span>Моя копилка</span><strong>1 840 ₽</strong><small>До цели ещё 3 160 ₽</small></article>
      </section>

      <div className="section-heading"><div><p className="eyebrow">Карта дня</p><h2>Твои миссии</h2></div><span className="progress-pill">{done.length}/7 выполнено</span></div>

      <section className="mission-grid">
        {missions.map((mission) => {
          const completed = done.includes(mission.id);
          return (
            <article className={`mission-card ${mission.color} ${completed ? "completed" : ""}`} key={mission.id}>
              <button className="mission-open" type="button" onClick={() => setActive(mission)}>
                <span className="mission-icon" aria-hidden="true">{mission.icon}</span>
                <span className="mission-text"><strong>{mission.title}</strong><small>{mission.note}</small></span>
                <span className="mission-stars">+{mission.stars} ★</span>
              </button>
              <button className="complete-button" type="button" onClick={() => toggleMission(mission)} aria-pressed={completed}>{completed ? "✓ Готово!" : "Я сделала"}</button>
            </article>
          );
        })}
      </section>

      <section className="my-day-card">
        <div className="my-day-icon">🌈</div>
        <div><p className="eyebrow">Без оценок и звёзд</p><h2>Мой день</h2><p>Расскажи, какое у тебя настроение и что ты хочешь рассказать папе.</p></div>
        <button type="button">Открыть дневник →</button>
      </section>

      <footer className="game-footer"><span>Сегодня главное — попробовать</span><span>Ошибки не забирают звёзды 💛</span></footer>

      {active && (
        <div className="modal-backdrop" role="presentation" onClick={() => setActive(null)}>
          <section className={`mission-modal ${active.color}`} role="dialog" aria-modal="true" aria-labelledby="mission-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setActive(null)} aria-label="Закрыть">×</button>
            <span className="modal-icon">{active.icon}</span><p className="eyebrow">Сегодняшняя миссия</p><h2 id="mission-title">{active.title}</h2><p>{active.note}</p>
            <div className="reward-banner">Награда: {active.stars} {active.stars === 1 ? "звезда" : "звезды"}</div>
            <button className="modal-action" type="button" onClick={() => { toggleMission(active); setActive(null); }}>{done.includes(active.id) ? "Отменить отметку" : "Миссия выполнена!"}</button>
          </section>
        </div>
      )}
    </main>
  );
}
