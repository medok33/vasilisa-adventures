export type MathQuestion = { id: string; label: string; answer: string };
export type EnglishQuestion = { id: string; icon: string; label: string; options: string[]; answer: string };
export type DailyContent = {
  math: MathQuestion[];
  english: EnglishQuestion[];
  kindness: string[];
  independence: string[];
  order: string[];
  secret: string;
};

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function randomFor(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number, count: number) {
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, count);
}

function options(answer: string, distractors: string[], random: () => number) {
  return pick([answer, ...distractors], random, 3);
}

const words = [
  ["📘", "книга", "book", ["room", "window"]], ["🚪", "дверь", "door", ["chair", "shoes"]],
  ["🪟", "окно", "window", ["table", "garden"]], ["🪑", "стул", "chair", ["door", "bed"]],
  ["🍎", "яблоко", "apple", ["bread", "milk"]], ["🥛", "молоко", "milk", ["water", "apple"]],
  ["🐶", "собака", "dog", ["cat", "bird"]], ["🐱", "кошка", "cat", ["dog", "fish"]],
  ["☀️", "солнечно", "sunny", ["rainy", "cold"]], ["🌧️", "дождливо", "rainy", ["sunny", "warm"]],
  ["👗", "платье", "dress", ["shirt", "shoes"]], ["👟", "обувь", "shoes", ["dress", "hat"]],
  ["🏫", "школа", "school", ["home", "park"]], ["🌳", "парк", "park", ["school", "room"]],
] as const;

const phrases = [
  ["I like this book.", "Мне нравится эта книга.", ["Я открываю дверь.", "У меня есть кошка."]],
  ["My room is clean.", "Моя комната чистая.", ["Моя школа большая.", "Сегодня дождливо."]],
  ["I can help you.", "Я могу тебе помочь.", ["Я умею читать.", "Я иду в парк."]],
  ["The cat is under the chair.", "Кошка под стулом.", ["Собака у двери.", "Книга на столе."]],
  ["It is sunny today.", "Сегодня солнечно.", ["Сегодня холодно.", "Завтра будет дождь."]],
  ["I have a red dress.", "У меня есть красное платье.", ["Мне нужна синяя шляпа.", "Мои туфли новые."]],
] as const;

const kindness = [
  "Помочь дома до того, как тебя попросят", "Сказать близкому человеку, за что ты ему благодарна",
  "Поддержать того, кому сегодня грустно", "Поделиться чем-то и не ждать награды",
  "Сделать маленькую заботу тайно", "Позвонить близкому и спросить, как его дела",
  "Уступить другому право выбрать первым", "Навести порядок в общем месте, а не только у себя",
];
const independence = [
  "Сама начать читать в выбранное время", "Сама подготовить одежду и вещи на завтра",
  "Сама убрать после еды", "Сама проверить школьные принадлежности",
  "Сама вспомнить о важном домашнем деле", "Сама закончить начатое без напоминания",
  "Сама распланировать три дела на день", "Сама положить грязную одежду в стирку",
];
const order = [
  "Вернуть на место минимум 5 вещей", "Освободить и протереть свой стол", "Подготовить одежду на завтра",
  "Проверить и поставить аккуратно обувь", "Разобрать одну полку или ящик", "Собрать мусор в своей комнате",
  "Привести в порядок школьный рюкзак", "Заправить кровать и расправить покрывало",
];
const secrets = [
  "Сделай сегодня одно доброе дело так, чтобы никто не видел.",
  "Узнай у близкого человека, чем ты можешь ему помочь.",
  "Заметь три красивые вещи вокруг и вечером назови их близкому человеку.",
  "Оставь кому-нибудь маленькую добрую записку.",
  "Научи младшего или друга чему-то, что хорошо умеешь.",
  "Поблагодари человека за то, что обычно кажется привычным.",
  "Сделай одно полезное дело раньше обычного.",
];

export function dailyContent(day: string): DailyContent {
  const random = randomFor(`vasilisa:${day}`);
  const a = 100 + Math.floor(random() * 800);
  const b = 50 + Math.floor(random() * 350);
  const factorA = 12 + Math.floor(random() * 38);
  const factorB = 2 + Math.floor(random() * 8);
  const divisor = 2 + Math.floor(random() * 8);
  const quotient = 10 + Math.floor(random() * 70);
  const price = (3 + Math.floor(random() * 7)) * 10;
  const paid = price + (2 + Math.floor(random() * 6)) * 10;
  const math: MathQuestion[] = [
    { id: `${day}-sum`, label: `${a} + ${b}`, answer: String(a + b) },
    { id: `${day}-diff`, label: `${a + b + 20} − ${b}`, answer: String(a + 20) },
    { id: `${day}-multiply`, label: `${factorA} × ${factorB}`, answer: String(factorA * factorB) },
    { id: `${day}-divide`, label: `${divisor * quotient} ÷ ${divisor}`, answer: String(quotient) },
    { id: `${day}-story`, label: `Книга стоит ${price} ₽, а блокнот — 20 ₽. Дали ${paid + 20} ₽. Сколько сдачи?`, answer: String(paid - price) },
  ];
  const chosenWords = pick(words, random, 4);
  const phrase = pick(phrases, random, 1)[0];
  const english: EnglishQuestion[] = chosenWords.map(([icon, label, answer, wrong], index) => ({
    id: `${day}-word-${index}`, icon, label, answer, options: options(answer, [...wrong], random),
  }));
  english.push({ id: `${day}-phrase`, icon: phrase[0], label: "Выбери перевод", answer: phrase[1], options: options(phrase[1], [...phrase[2]], random) });
  return {
    math: pick(math, random, math.length), english,
    kindness: pick(kindness, random, 3), independence: pick(independence, random, 4), order: pick(order, random, 4),
    secret: pick(secrets, random, 1)[0],
  };
}
