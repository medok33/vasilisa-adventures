export type WeeklyWorld = {
  name: string;
  subtitle: string;
  bigAdventure: string;
  chapters: readonly { title: string; goal: string }[];
  finds: readonly string[];
};

const WORLDS: readonly WeeklyWorld[] = [
  {
    name: "Долина солнечных троп",
    subtitle: "Неделя тёплых открытий",
    bigAdventure: "Семейная прогулка по новому маршруту",
    chapters: [
      { title: "Первый луч", goal: "Начать путь и заметить, что сегодня получается" },
      { title: "Тропа любопытства", goal: "Собрать новые знания маленькими шагами" },
      { title: "Мост смелых попыток", goal: "Пробовать спокойно и не бояться подсказок" },
      { title: "Поляна добрых дел", goal: "Добавить в день немного заботы" },
      { title: "Секрет сияющей книги", goal: "Найти важную мысль в сегодняшнем чтении" },
      { title: "Мастерская находок", goal: "Собрать вместе открытия этой недели" },
      { title: "Праздник путешественницы", goal: "Оглянуться на путь и выбрать любимый момент" },
    ],
    finds: ["луч", "лист", "ключ", "лента", "кристалл", "перо", "звезда"],
  },
  {
    name: "Архипелаг добрых ветров",
    subtitle: "Неделя морских открытий",
    bigAdventure: "Семейный вечер с выбранной Василисой игрой",
    chapters: [
      { title: "Парус поднят", goal: "Спокойно выбрать первую миссию" },
      { title: "Остров новых слов", goal: "Замечать знакомое и открывать новое" },
      { title: "Бухта решений", goal: "Искать свой путь к ответу" },
      { title: "Маяк заботы", goal: "Сделать один добрый шаг" },
      { title: "Карта книжных морей", goal: "Унести с собой главную мысль чтения" },
      { title: "Сундук открытий", goal: "Собрать находки недели без спешки" },
      { title: "Возвращение домой", goal: "Вспомнить, чем хочется гордиться" },
    ],
    finds: ["ракушка", "компас", "канат", "фонарь", "карта", "монета", "парус"],
  },
  {
    name: "Лес говорящих созвездий",
    subtitle: "Неделя лесных загадок",
    bigAdventure: "Семейный поход или пикник",
    chapters: [
      { title: "Ворота леса", goal: "Войти в новый маршрут в своём темпе" },
      { title: "Шёпот старого дуба", goal: "Слушать, читать и замечать важное" },
      { title: "Ручей догадок", goal: "Проверять идеи и пользоваться подсказками" },
      { title: "Домик светлячка", goal: "Поддержать кого-то маленьким делом" },
      { title: "Книжная поляна", goal: "Подумать об одном важном моменте книги" },
      { title: "Тропа домой", goal: "Закончить неделю спокойно и уверенно" },
      { title: "Созвездие Василисы", goal: "Назвать своё главное открытие" },
    ],
    finds: ["желудь", "шишка", "капля", "огонёк", "цветок", "веточка", "созвездие"],
  },
  {
    name: "Город воздушных мостов",
    subtitle: "Неделя лёгких изобретений",
    bigAdventure: "Семейная творческая мастерская",
    chapters: [
      { title: "Билет в облака", goal: "Выбрать удобное начало путешествия" },
      { title: "Улица вопросов", goal: "Разобраться в коротких загадках" },
      { title: "Башня слов", goal: "Соединять слова и смыслы" },
      { title: "Сад помощников", goal: "Сделать пространство чуточку уютнее" },
      { title: "Библиотека ветра", goal: "Поймать одну важную книжную мысль" },
      { title: "Площадь мастеров", goal: "Увидеть, сколько уже получилось" },
      { title: "Воздушный парад", goal: "Отпраздновать свои старания" },
    ],
    finds: ["билет", "винтик", "флажок", "колокол", "свиток", "шестерёнка", "крыло"],
  },
  {
    name: "Берег хрустальных волн",
    subtitle: "Неделя береговых секретов",
    bigAdventure: "Семейная вылазка за красивыми фотографиями",
    chapters: [
      { title: "След на песке", goal: "Сделать первый удобный шаг" },
      { title: "Послание в бутылке", goal: "Открыть несколько новых смыслов" },
      { title: "Тайна прилива", goal: "Решать спокойно, шаг за шагом" },
      { title: "Домик у берега", goal: "Позаботиться о себе и других" },
      { title: "История старого маяка", goal: "Заметить главное в прочитанном" },
      { title: "Коллекция путешественницы", goal: "Собрать лучшие находки недели" },
      { title: "Свет над морем", goal: "Выбрать самый тёплый момент недели" },
    ],
    finds: ["камешек", "бутылка", "жемчужина", "лодочка", "фонарь", "коралл", "маяк"],
  },
] as const;

const DAY_MS = 86_400_000;

function utcDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

export function mondayOf(day: string) {
  const date = utcDay(day);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function weeklyAdventure(day: string, completedMissions: number) {
  const date = utcDay(day);
  const monday = utcDay(mondayOf(day));
  const weekNumber = Math.floor(monday.getTime() / DAY_MS / 7);
  const world = WORLDS[((weekNumber % WORLDS.length) + WORLDS.length) % WORLDS.length];
  const chapterIndex = Math.round((date.getTime() - monday.getTime()) / DAY_MS);
  const completed = Math.max(0, Math.min(7, Math.round(completedMissions || 0)));
  return {
    world,
    weekStart: monday.toISOString().slice(0, 10),
    chapterIndex,
    chapter: world.chapters[chapterIndex],
    completed,
    nextMissionIndex: completed === 7 ? null : completed,
    foundItems: world.finds.slice(0, completed),
    finalScene: completed === 7,
  };
}

export function weeklyFragmentCount(day: string, previousDays: readonly { day: string; stars: number }[], todayStars: number) {
  const monday = mondayOf(day);
  const earnedBeforeToday = previousDays.filter((item) => item.day >= monday && item.day < day && item.stars >= 7).length;
  return Math.min(5, earnedBeforeToday + (todayStars >= 7 ? 1 : 0));
}

export const WEEKLY_WORLD_COUNT = WORLDS.length;
