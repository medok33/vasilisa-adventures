export type LearningSubject = "math" | "english";
export type AssignmentRole = "current" | "reinforcement" | "stretch";
export type QuestionKind = "input" | "choice";

export const SUBJECT_SKILLS = {
  math: ["addition", "subtraction", "multiplication", "division", "order_operations", "equations", "word_problem", "measurement", "money"],
  english: ["vocabulary", "translation", "spelling", "word_order", "grammar_to_be", "grammar_have_got", "grammar_can", "reading"],
} as const;

export type MathSkill = typeof SUBJECT_SKILLS.math[number];
export type EnglishSkill = typeof SUBJECT_SKILLS.english[number];
export type LearningSkill = MathSkill | EnglishSkill;

export type SkillState = {
  subject: LearningSubject;
  skill: LearningSkill;
  level: number;
  state?: "collecting" | "hold" | "reinforce" | "increase";
  reviewDueDates?: string[];
};

export type LearningQuestion = {
  id: string;
  subject: LearningSubject;
  skill: LearningSkill;
  topic: string;
  level: number;
  role: AssignmentRole;
  templateId: string;
  label: string;
  answer: string;
  kind: QuestionKind;
  options?: string[];
  hint: string;
  icon?: string;
  fingerprint: string;
};

export type AssignmentContext = {
  day: string;
  states?: SkillState[];
  recentFingerprints?: Iterable<string>;
  previousTemplates?: Iterable<string>;
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

function pick<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(random() * items.length) % items.length];
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool;
}

function normalizeLevel(level: number | undefined) {
  return Math.max(0, Math.min(4, Math.round(level ?? 1)));
}

function stateFor(subject: LearningSubject, skill: LearningSkill, states: SkillState[]) {
  return states.find((state) => state.subject === subject && state.skill === skill) ?? { subject, skill, level: 1, state: "collecting" as const, reviewDueDates: [] };
}

function dueForReview(state: SkillState, day: string) {
  return state.state === "reinforce" || (state.reviewDueDates ?? []).some((due) => due <= day);
}

function selectSkills(subject: LearningSubject, count: number, context: AssignmentContext) {
  const states = context.states ?? [];
  const skills = [...SUBJECT_SKILLS[subject]] as LearningSkill[];
  const weekIndex = Math.floor(new Date(`${context.day}T12:00:00Z`).getTime() / 604_800_000);
  const random = randomFor(`${weekIndex}:${subject}:skills`);
  const due = shuffle(skills.filter((skill) => dueForReview(stateFor(subject, skill, states), context.day)), random);
  const normal = shuffle(skills.filter((skill) => !due.includes(skill)), random);
  const selected: Array<{ skill: LearningSkill; role: AssignmentRole; level: number }> = [];
  const focus = normal[0] ?? skills[0];
  const focusState = stateFor(subject, focus, states);
  const reinforcement = due[0] ?? normal.find((skill) => skill !== focus) ?? skills.find((skill) => skill !== focus) ?? focus;
  const reinforcementState = stateFor(subject, reinforcement, states);

  while (selected.length < count - 2) {
    selected.push({ skill: focus, role: "current", level: normalizeLevel(focusState.level) });
  }
  selected.push({ skill: reinforcement, role: "reinforcement", level: normalizeLevel(reinforcementState.level) });
  selected.push({ skill: focus, role: "stretch", level: normalizeLevel(normalizeLevel(focusState.level) + 1) });
  return selected.slice(0, count);
}

const englishWords = [
  ["📘", "книга", "book", ["room", "window"]], ["🚪", "дверь", "door", ["chair", "shoes"]],
  ["🪟", "окно", "window", ["table", "garden"]], ["🪑", "стул", "chair", ["door", "bed"]],
  ["🍎", "яблоко", "apple", ["bread", "milk"]], ["🥛", "молоко", "milk", ["water", "apple"]],
  ["🐶", "собака", "dog", ["cat", "bird"]], ["🐱", "кошка", "cat", ["dog", "fish"]],
  ["☀️", "солнечно", "sunny", ["rainy", "cold"]], ["🌧️", "дождливо", "rainy", ["sunny", "warm"]],
  ["👗", "платье", "dress", ["shirt", "shoes"]], ["🏫", "школа", "school", ["home", "park"]],
  ["🏠", "дом", "house", ["school", "room"]], ["🌳", "парк", "park", ["garden", "street"]],
  ["🛏️", "кровать", "bed", ["chair", "table"]], ["🧸", "игрушка", "toy", ["book", "ball"]],
  ["⚽", "мяч", "ball", ["toy", "bike"]], ["🚲", "велосипед", "bike", ["bus", "car"]],
  ["🚌", "автобус", "bus", ["bike", "train"]], ["🚗", "машина", "car", ["bus", "boat"]],
  ["🐦", "птица", "bird", ["fish", "horse"]], ["🐟", "рыба", "fish", ["bird", "frog"]],
  ["🐴", "лошадь", "horse", ["cow", "sheep"]], ["🐸", "лягушка", "frog", ["fish", "bird"]],
  ["🍞", "хлеб", "bread", ["cake", "cheese"]], ["🧀", "сыр", "cheese", ["bread", "rice"]],
  ["🍰", "торт", "cake", ["bread", "soup"]], ["💧", "вода", "water", ["milk", "juice"]],
  ["🍊", "апельсин", "orange", ["apple", "lemon"]], ["🍌", "банан", "banana", ["orange", "apple"]],
  ["🥕", "морковь", "carrot", ["potato", "tomato"]], ["🍅", "помидор", "tomato", ["carrot", "potato"]],
  ["✏️", "карандаш", "pencil", ["pen", "ruler"]], ["🖊️", "ручка", "pen", ["pencil", "brush"]],
  ["📏", "линейка", "ruler", ["pen", "pencil"]], ["🎒", "рюкзак", "schoolbag", ["bag", "box"]],
  ["👟", "обувь", "shoes", ["dress", "shirt"]], ["👒", "шляпа", "hat", ["dress", "shoes"]],
  ["👕", "рубашка", "shirt", ["dress", "coat"]], ["🧥", "пальто", "coat", ["shirt", "hat"]],
  ["🌸", "цветок", "flower", ["tree", "grass"]], ["🌲", "дерево", "tree", ["flower", "garden"]],
  ["🌿", "трава", "grass", ["tree", "flower"]], ["🌍", "земля", "earth", ["sky", "sea"]],
  ["🌙", "луна", "moon", ["sun", "star"]], ["⭐", "звезда", "star", ["moon", "sun"]],
  ["🌊", "море", "sea", ["river", "lake"]], ["🏞️", "река", "river", ["sea", "lake"]],
  ["😊", "счастливый", "happy", ["sad", "tired"]], ["😢", "грустный", "sad", ["happy", "angry"]],
  ["🔥", "горячий", "hot", ["cold", "warm"]], ["❄️", "холодный", "cold", ["hot", "warm"]],
  ["🔴", "красный", "red", ["blue", "green"]], ["🔵", "синий", "blue", ["red", "yellow"]],
  ["🟢", "зелёный", "green", ["blue", "black"]], ["🟡", "жёлтый", "yellow", ["red", "white"]],
  ["👩", "мама", "mother", ["father", "sister"]], ["👨", "папа", "father", ["mother", "brother"]],
  ["👧", "сестра", "sister", ["brother", "friend"]], ["👦", "брат", "brother", ["sister", "friend"]],
  ["👵", "бабушка", "grandmother", ["mother", "grandfather"]], ["👴", "дедушка", "grandfather", ["father", "grandmother"]],
  ["👨‍👩‍👧", "семья", "family", ["friend", "people"]], ["🤝", "друг", "friend", ["family", "teacher"]],
  ["🌅", "утро", "morning", ["evening", "night"]], ["🌆", "вечер", "evening", ["morning", "day"]],
  ["🌃", "ночь", "night", ["day", "morning"]], ["📅", "день", "day", ["week", "month"]],
  ["🗓️", "неделя", "week", ["day", "year"]], ["📆", "месяц", "month", ["week", "year"]],
  ["🎆", "год", "year", ["month", "week"]], ["⏰", "сегодня", "today", ["tomorrow", "yesterday"]],
  ["🏃", "бегать", "run", ["jump", "walk"]], ["🤸", "прыгать", "jump", ["run", "swim"]],
  ["🏊", "плавать", "swim", ["run", "dance"]], ["📖", "читать", "read", ["write", "draw"]],
  ["✍️", "писать", "write", ["read", "speak"]], ["🎨", "рисовать", "draw", ["write", "read"]],
  ["🎤", "петь", "sing", ["dance", "speak"]], ["💃", "танцевать", "dance", ["sing", "jump"]],
  ["🎮", "играть", "play", ["work", "help"]], ["🙌", "помогать", "help", ["play", "work"]],
  ["🐘", "большой", "big", ["small", "short"]], ["🐭", "маленький", "small", ["big", "long"]],
  ["📐", "длинный", "long", ["short", "small"]], ["↔️", "короткий", "short", ["long", "big"]],
  ["🕰️", "старый", "old", ["new", "young"]], ["✨", "новый", "new", ["old", "clean"]],
  ["🧼", "чистый", "clean", ["dirty", "new"]], ["🧹", "грязный", "dirty", ["clean", "old"]],
] as const;

function makeMath(skill: MathSkill, level: number, random: () => number) {
  const scale = Math.max(1, level + 1);
  const a = 8 + Math.floor(random() * 22 * scale);
  const b = 3 + Math.floor(random() * 12 * scale);
  const factorA = 2 + Math.floor(random() * Math.min(8, 3 + scale));
  const factorB = 2 + Math.floor(random() * Math.min(8, 3 + scale));
  switch (skill) {
    case "addition": return { templateId: `math-add-${level % 2}`, label: `${a} + ${b}`, answer: String(a + b), hint: "Сложи десятки, затем единицы." };
    case "subtraction": return { templateId: `math-sub-${level % 2}`, label: `${a + b} − ${b}`, answer: String(a), hint: "Проверь вычитание обратным сложением." };
    case "multiplication": return { templateId: `math-mul-${level % 2}`, label: `${factorA} × ${factorB}`, answer: String(factorA * factorB), hint: "Вспомни строку таблицы для первого множителя." };
    case "division": return { templateId: `math-div-${level % 2}`, label: `${factorA * factorB} ÷ ${factorA}`, answer: String(factorB), hint: "Какое число нужно умножить на делитель?" };
    case "order_operations": return { templateId: `math-order-${level % 2}`, label: `${a} + ${factorA} × ${factorB}`, answer: String(a + factorA * factorB), hint: "Сначала выполняется умножение." };
    case "equations": return { templateId: `math-equation-${level % 2}`, label: `x + ${b} = ${a + b}. Чему равен x?`, answer: String(a), hint: "Вычти известное слагаемое из суммы." };
    case "measurement": {
      const meters = 1 + Math.floor(random() * Math.min(20, 8 + scale * 3));
      const centimeters = 1 + Math.floor(random() * 99);
      return { templateId: `math-measure-${level % 2}`, label: `${meters} м ${centimeters} см — сколько это сантиметров?`, answer: String(meters * 100 + centimeters), hint: "В одном метре 100 сантиметров." };
    }
    case "money": {
      const price = (3 + Math.floor(random() * 7)) * 10;
      const paid = price + (2 + Math.floor(random() * 6)) * 10;
      return { templateId: `math-money-${level % 2}`, label: `Покупка стоит ${price} ₽. Дали ${paid} ₽. Сколько сдачи?`, answer: String(paid - price), hint: "Из уплаченной суммы вычти стоимость покупки." };
    }
    default: return { templateId: `math-story-${level % 2}`, label: `В коробке было ${a + b} карандашей. ${b} отдали. Сколько осталось?`, answer: String(a), hint: "Нужно найти, сколько осталось после уменьшения." };
  }
}

function makeEnglish(skill: EnglishSkill, level: number, random: () => number) {
  const [icon, russian, english, wrong] = pick(englishWords, random);
  const choice = (answer: string, distractors: readonly string[]) => shuffle([answer, ...distractors], random).slice(0, 3);
  const subjects = [
    ["I", "am", "have"], ["You", "are", "have"], ["We", "are", "have"],
    ["They", "are", "have"], ["She", "is", "has"], ["He", "is", "has"],
  ] as const;
  const [pronoun, toBe, have] = pick(subjects, random);
  switch (skill) {
    case "vocabulary": return { templateId: `en-vocabulary-${level % 2}`, label: russian, answer: english, kind: "choice" as const, options: choice(english, wrong), icon, hint: "Вспомни слово по картинке и первому звуку." };
    case "spelling": return { templateId: `en-spelling-${level % 2}`, label: `Напиши по-английски: ${russian}`, answer: english, kind: "input" as const, icon, hint: `Слово начинается с буквы «${english[0]}».` };
    case "word_order": {
      const verb = pick(["like", "see", "read", "have", "can help"] as const, random);
      const object = pick(["this book", "a red dress", "my dog", "the green park", "a small cat", "your school"] as const, random);
      const sentence = `${pronoun} ${verb} ${object}`;
      return { templateId: `en-order-${level % 2}`, label: `Собери фразу: ${shuffle(sentence.split(" "), random).join(" / ")}`, answer: sentence, kind: "input" as const, hint: `Начни с ${pronoun}, затем поставь действие.` };
    }
    case "grammar_to_be": {
      const ending = pick(["ten years old", "happy today", "at school", "ready", "in the room", "my friend", "very kind", "in the park"] as const, random);
      return { templateId: `en-to-be-${level % 2}`, label: `${pronoun} ___ ${ending}.`, answer: toBe, kind: "choice" as const, options: choice(toBe, ["am", "is", "are"].filter((item) => item !== toBe)), hint: `Для ${pronoun} нужна форма ${toBe}.` };
    }
    case "grammar_have_got": {
      const thing = pick(["a red dress", "a new book", "a small dog", "two pencils", "a blue bag", "a big room", "green shoes", "a good friend"] as const, random);
      return { templateId: `en-have-got-${level % 2}`, label: `${pronoun} ___ got ${thing}.`, answer: have, kind: "choice" as const, options: choice(have, ["have", "has", "am"].filter((item) => item !== have)), hint: `После ${pronoun} используется ${have}.` };
    }
    case "grammar_can": {
      const action = pick(["read this book", "help my friend", "open the door", "see a bird", "count to ten", "run in the park", "write my name", "speak English", "draw a cat", "swim well"] as const, random);
      return { templateId: `en-can-${level % 2}`, label: `${pronoun} ___ ${action}.`, answer: "can", kind: "choice" as const, options: choice("can", [toBe, have]), hint: "Нужно слово со значением «могу» или «умею»." };
    }
    case "reading": {
      const name = pick(["Tom", "Ann", "Ben", "Kate", "Sam", "Nina", "Alex", "Mary"] as const, random);
      const item = pick(["a dog", "a cat", "a red book", "a blue bag", "a new bike", "a green hat", "two pencils", "a small bird"] as const, random);
      return { templateId: `en-reading-${level % 2}`, label: `${name} has ${item}. Who has ${item}?`, answer: name, kind: "input" as const, hint: "Имя стоит в начале короткого текста." };
    }
    default: {
      const [name, russianName] = pick([
        ["Tom", "Тома"], ["Ann", "Энн"], ["Ben", "Бена"], ["Kate", "Кейт"],
        ["Sam", "Сэма"], ["Nina", "Нины"], ["Alex", "Алекса"], ["Mary", "Мэри"],
      ] as const, random);
      const things = [
        ["a small dog", "маленькая собака"], ["a new bike", "новый велосипед"],
        ["a red book", "красная книга"], ["a blue bag", "синяя сумка"],
        ["a green hat", "зелёная шляпа"], ["a funny cat", "забавная кошка"],
        ["a yellow pencil", "жёлтый карандаш"], ["a big ball", "большой мяч"],
      ] as const;
      const [englishThing, russianThing] = pick(things, random);
      const source = `${name} has got ${englishThing}.`;
      const translation = `У ${russianName} есть ${russianThing}.`;
      const distractors = shuffle(things.filter((item) => item[0] !== englishThing).map((item) => `У ${russianName} есть ${item[1]}.`), random).slice(0, 2);
      return { templateId: `en-translation-${level % 2}`, label: `Выбери перевод: ${source}`, answer: translation, kind: "choice" as const, options: choice(translation, distractors), hint: "Найди знакомые слова и сначала определи, о ком говорится." };
    }
  }
}

function buildQuestion(subject: LearningSubject, selection: { skill: LearningSkill; role: AssignmentRole; level: number }, day: string, position: number, salt: number) {
  const random = randomFor(`${day}:${subject}:${selection.skill}:${selection.role}:${position}:${salt}`);
  const generated = subject === "math"
    ? { ...makeMath(selection.skill as MathSkill, selection.level, random), kind: "input" as const, options: undefined, icon: undefined }
    : makeEnglish(selection.skill as EnglishSkill, selection.level, random);
  const answer = generated.answer;
  const templateId = `${generated.templateId}-v${salt % 16}`;
  const fingerprint = `${subject}|${selection.skill}|${generated.label}|${answer}`.toLowerCase();
  return {
    id: `${day}-${subject}-${position + 1}-${hash(fingerprint).toString(36)}`,
    subject,
    skill: selection.skill,
    topic: selection.skill,
    level: normalizeLevel(selection.level),
    role: selection.role,
    templateId,
    label: generated.label,
    answer,
    kind: generated.kind,
    options: generated.options ? [...generated.options] : undefined,
    hint: generated.hint,
    icon: generated.icon,
    fingerprint,
  } satisfies LearningQuestion;
}

export function generateDailyAssignments(context: AssignmentContext) {
  const recent = new Set(context.recentFingerprints ?? []);
  const previousTemplates = new Set(context.previousTemplates ?? []);
  const output: Record<LearningSubject, LearningQuestion[]> = { math: [], english: [] };
  for (const subject of ["math", "english"] as const) {
    const selections = selectSkills(subject, subject === "math" ? 5 : 6, context);
    output[subject] = selections.map((selection, position) => {
      let candidate = buildQuestion(subject, selection, context.day, position, 0);
      for (let salt = 1; salt <= 400 && (recent.has(candidate.fingerprint) || previousTemplates.has(candidate.templateId)); salt += 1) {
        candidate = buildQuestion(subject, selection, context.day, position, salt);
      }
      recent.add(candidate.fingerprint);
      return candidate;
    });
  }
  return output;
}

export function normalizeAnswer(value: string) {
  return value.trim().replace(/[.!?]+$/u, "").replace(/\s+/gu, " ").toLocaleLowerCase("ru-RU");
}

export function isAnswerCorrect(question: Pick<LearningQuestion, "answer">, answer: string) {
  return normalizeAnswer(answer) === normalizeAnswer(question.answer);
}

export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export type AdaptationEvidence = {
  day: string;
  level: number;
  total: number;
  correct: number;
  hints: number;
  overTwoAttempts: number;
  distinctDays: number;
  perfectStreakDays: number;
};

export function decideSkillAdaptation(evidence: AdaptationEvidence) {
  const { day, total, correct, hints, overTwoAttempts, distinctDays, perfectStreakDays } = evidence;
  const oldLevel = normalizeLevel(evidence.level);
  const accuracy = total ? correct / total : 0;
  if (total < 7 || distinctDays < 3) return {
    level: oldLevel,
    decision: "collecting" as const,
    reason: `По навыку собрано ${total} из 7 первых попыток минимум за три учебных дня. Безошибочная серия по предмету: ${perfectStreakDays} из 7 дней.`,
    reviewDueDates: [] as string[],
    accuracy,
  };
  if (accuracy < 0.7 || overTwoAttempts >= 2 || hints >= 2) return {
    level: oldLevel,
    decision: "reinforce" as const,
    reason: "Навык не понижен: назначено спокойное закрепление с возвратом через 2, 4 и 7 дней.",
    reviewDueDates: [addDays(day, 2), addDays(day, 4), addDays(day, 7)],
    accuracy,
  };
  if (correct === total && hints === 0 && perfectStreakDays >= 7) {
    const level = Math.min(4, oldLevel + 1);
    return {
      level,
      decision: level === oldLevel ? "hold" as const : "increase" as const,
      reason: level === oldLevel ? "Семь последовательных дней пройдены без ошибок и подсказок; достигнут безопасный предел уровня." : "Семь последовательных дней по предмету пройдены с первой попытки и без подсказок; начинается новый семидневный цикл.",
      reviewDueDates: [] as string[],
      accuracy,
    };
  }
  if (correct === total && hints === 0) return {
    level: oldLevel,
    decision: "hold" as const,
    reason: `Первые ответы по навыку верны, но безошибочная серия по предмету составляет ${perfectStreakDays} из 7 последовательных дней.`,
    reviewDueDates: [] as string[],
    accuracy,
  };
  return {
    level: oldLevel,
    decision: "hold" as const,
    reason: "Текущий уровень сохранён: ошибки исправляются, но для повышения пока недостаточно уверенных первых ответов.",
    reviewDueDates: [] as string[],
    accuracy,
  };
}
