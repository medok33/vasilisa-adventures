export type BookId = "emerald" | "urfin" | "pippi";
export type ReadingRange = { from: number; to: number };
export type BookProgress = Partial<Record<BookId, ReadingRange[]>>;
export type BookReflection = { text: string; savedAt: string; bonusStars: number; bonusAwardedAt: string };
export type BookReflections = Partial<Record<BookId, BookReflection>>;
export type ReadingQuestionKind = "fact" | "meaning";
export type ReadingQuestion = {
  id: string;
  kind: ReadingQuestionKind;
  fromPage: number;
  unlockPage: number;
  focus: string;
  prompt: string;
  options: readonly string[];
  answer: string;
  acceptedAnswers?: readonly string[];
  /** Each group represents one necessary idea; one word from every group is enough. */
  acceptedConcepts?: readonly (readonly string[])[];
};
export type DailyReadingSession = {
  day: string;
  bookId: BookId;
  from: number;
  to: number;
  minutes: number;
  questionIds: string[];
  answers: Record<string, string>;
  finished: boolean;
};
export type Book = { id: BookId; title: string; isbn: string; firstPage: number; lastPage: number; questions: ReadingQuestion[] };

export const BOOKS: readonly Book[] = [
  { id: "emerald", title: "Волшебник Изумрудного города", isbn: "978-5-699-99047-4", firstPage: 5, lastPage: 288, questions: [
    { id: "em-1-meaning", kind: "meaning", fromPage: 5, unlockPage: 30, focus: "Цель путешествия Элли", prompt: "Зачем Элли решила идти в Изумрудный город?", options: ["Попросить Гудвина помочь ей вернуться домой", "Найти спрятанный клад", "Стать правительницей города"], answer: "Попросить Гудвина помочь ей вернуться домой", acceptedAnswers: ["Она хотела попросить Гудвина вернуть ее домой", "Чтобы Гудвин помог Элли попасть домой"], acceptedConcepts: [["гудвин"], ["дом", "домой", "вернут", "попаст"]] },
    { id: "em-2-meaning", kind: "meaning", fromPage: 31, unlockPage: 90, focus: "Почему герои идут вместе", prompt: "Почему спутники Элли продолжили путь вместе?", options: ["Каждому была нужна помощь Гудвина", "Они искали сокровища", "Они хотели захватить город"], answer: "Каждому была нужна помощь Гудвина", acceptedAnswers: ["Каждый надеялся, что Гудвин ему поможет", "Им всем нужна была помощь Гудвина"], acceptedConcepts: [["кажд", "всем"], ["гудвин"], ["помощ"]] },
    { id: "em-3-meaning", kind: "meaning", fromPage: 91, unlockPage: 145, focus: "Взаимная помощь в опасности", prompt: "Что помогло друзьям пройти опасный участок пути?", options: ["Они помогали друг другу", "Они бросили отставших", "Они вернулись домой"], answer: "Они помогали друг другу", acceptedAnswers: ["Друзья выручали друг друга", "Они действовали вместе и помогали"], acceptedConcepts: [["друг", "вмест"], ["помог", "выруч"]] },
    { id: "em-4-meaning", kind: "meaning", fromPage: 146, unlockPage: 205, focus: "Поддержка помогает сохранить надежду", prompt: "Почему друзья смогли продолжить путь после плена?", options: ["Они не перестали поддерживать друг друга", "Им разрешили забыть обещание", "Они решили служить Бастинде"], answer: "Они не перестали поддерживать друг друга", acceptedAnswers: ["Они поддерживали и не бросали друг друга", "Друзья помогли друг другу не сдаться"], acceptedConcepts: [["друг"], ["поддерж", "помог"], ["не сдал", "продолж"]] },
    { id: "em-5-meaning", kind: "meaning", fromPage: 206, unlockPage: 288, focus: "Искомые качества проявляются в поступках", prompt: "Что друзья поняли о своих заветных качествах?", options: ["Эти качества уже проявлялись в их поступках", "Качества можно только купить", "Их мечты были неважными"], answer: "Эти качества уже проявлялись в их поступках", acceptedAnswers: ["У них уже были эти качества, это видно по поступкам", "Они показали свои качества делами"], acceptedConcepts: [["качеств"], ["поступ", "дел"]] },
  ]},
  { id: "urfin", title: "Урфин Джюс и его деревянные солдаты", isbn: "978-5-699-96357-7", firstPage: 5, lastPage: 248, questions: [
    { id: "ur-1-meaning", kind: "meaning", fromPage: 5, unlockPage: 30, focus: "Как Урфин решил использовать силу", prompt: "Как находка изменила планы Урфина?", options: ["Он решил создать послушную армию", "Он отказался от всех замыслов", "Он захотел стать садовником"], answer: "Он решил создать послушную армию", acceptedAnswers: ["Он захотел сделать армию, которая будет ему подчиняться", "Урфин решил собрать деревянных солдат"], acceptedConcepts: [["арм"], ["послуш", "подчин", "солдат"]] },
    { id: "ur-2-meaning", kind: "meaning", fromPage: 31, unlockPage: 73, focus: "Опасность бездумного подчинения", prompt: "Почему жителям города стало трудно сопротивляться?", options: ["Дуболомы выполняли приказы и не уставали", "Жители сами выбрали Урфина", "У города исчезли все ворота"], answer: "Дуболомы выполняли приказы и не уставали", acceptedAnswers: ["Дуболомы не уставали и слушались приказов", "Деревянные солдаты выполняли все приказы"], acceptedConcepts: [["дуболом", "деревян"], ["приказ", "слуша"], ["не устав"]] },
    { id: "ur-3-meaning", kind: "meaning", fromPage: 74, unlockPage: 122, focus: "Готовность прийти друзьям на помощь", prompt: "Почему Элли и Чарли отправились в опасный путь?", options: ["Чтобы помочь друзьям в Волшебной стране", "Чтобы найти золото", "Чтобы увидеть парад дуболомов"], answer: "Чтобы помочь друзьям в Волшебной стране", acceptedAnswers: ["Они пошли выручать друзей", "Элли и Чарли хотели помочь своим друзьям"], acceptedConcepts: [["друз"], ["помог", "выруч"]] },
    { id: "ur-4-meaning", kind: "meaning", fromPage: 123, unlockPage: 182, focus: "Смелость и взаимная помощь", prompt: "Что помогало героям преодолевать опасности в дороге?", options: ["Смелость и взаимная помощь", "Приказы Урфина", "Желание стать богатыми"], answer: "Смелость и взаимная помощь", acceptedAnswers: ["Они были смелыми и помогали друг другу", "Герои не боялись и выручали друзей"], acceptedConcepts: [["смел", "не боял"], ["помог", "выруч"]] },
    { id: "ur-5-meaning", kind: "meaning", fromPage: 183, unlockPage: 218, focus: "Совместные действия сильнее одиночных", prompt: "Почему сопротивление Урфину стало успешным?", options: ["Герои действовали вместе", "Урфин сам подарил им победу", "Дуболомы нашли сокровища"], answer: "Герои действовали вместе", acceptedAnswers: ["Они объединились", "Герои помогали друг другу и действовали сообща"], acceptedConcepts: [["вмест", "объедин", "сообща"], ["геро", "друз"]] },
    { id: "ur-6-meaning", kind: "meaning", fromPage: 219, unlockPage: 248, focus: "Власть на страхе непрочна", prompt: "Что история показывает о власти, которая держится на страхе?", options: ["Она не становится прочной", "Она всегда делает всех счастливыми", "Она не нуждается в помощниках"], answer: "Она не становится прочной", acceptedAnswers: ["На страхе нельзя построить крепкую власть", "Такая власть долго не продержится"], acceptedConcepts: [["страх"], ["не проч", "не креп", "не продерж"]] },
  ]},
  { id: "pippi", title: "Пеппи Длинныйчулок поселяется на вилле «Курица»", isbn: "978-5-389-10686-4", firstPage: 5, lastPage: 125, questions: [
    { id: "pi-1-meaning", kind: "meaning", fromPage: 5, unlockPage: 25, focus: "Самостоятельность Пеппи", prompt: "Почему знакомство с Пеппи удивило Томми и Аннику?", options: ["Она жила и вела хозяйство самостоятельно", "Она совсем не разговаривала", "Она была их новой учительницей"], answer: "Она жила и вела хозяйство самостоятельно", acceptedAnswers: ["Пеппи жила одна и сама вела дом", "Она сама заботилась о хозяйстве"], acceptedConcepts: [["пеппи"], ["сама", "одна", "самостоятель"], ["жила", "дом", "хозяйств"]] },
    { id: "pi-2-meaning", kind: "meaning", fromPage: 26, unlockPage: 45, focus: "Право искать собственный способ", prompt: "Как Пеппи реагирует, когда взрослые требуют обычного поведения?", options: ["Находит свой необычный способ действовать", "Всегда молча соглашается", "Сразу убегает из города"], answer: "Находит свой необычный способ действовать", acceptedAnswers: ["Она делает все по-своему", "Пеппи выбирает необычное решение"], acceptedConcepts: [["пеппи", "она"], ["по своему", "необыч", "свой способ"]] },
    { id: "pi-3-meaning", kind: "meaning", fromPage: 46, unlockPage: 65, focus: "Воображение превращает день в приключение", prompt: "Почему Томми и Аннике интересно проводить время с Пеппи?", options: ["Она превращает обычный день в приключение", "Она запрещает им играть", "Она даёт им школьные контрольные"], answer: "Она превращает обычный день в приключение", acceptedAnswers: ["С Пеппи обычные дела становятся приключениями", "Она придумывает интересные игры"], acceptedConcepts: [["пеппи", "она"], ["приключ", "игр", "интересн"]] },
    { id: "pi-4-meaning", kind: "meaning", fromPage: 66, unlockPage: 85, focus: "Пеппи не боится быть собой", prompt: "Почему поступки Пеппи часто удивляют взрослых?", options: ["Она делает всё по-своему", "Она боится говорить", "Она никогда не смеётся"], answer: "Она делает всё по-своему", acceptedAnswers: ["Пеппи поступает не как все", "Она не боится быть собой"], acceptedConcepts: [["пеппи", "она"], ["по своему", "не как все", "собой"]] },
    { id: "pi-5-meaning", kind: "meaning", fromPage: 86, unlockPage: 105, focus: "Забота и защита друзей", prompt: "Как Пеппи относится к своим друзьям?", options: ["Заботится и защищает", "Не замечает их", "Только командует ими"], answer: "Заботится и защищает", acceptedAnswers: ["Она бережет друзей и помогает им", "Пеппи их защищает"], acceptedConcepts: [["друз"], ["забот", "защищ", "береж", "помог"]] },
    { id: "pi-6-meaning", kind: "meaning", fromPage: 106, unlockPage: 125, focus: "Дружба делает дом особенным", prompt: "Что делает виллу «Курица» особенным местом?", options: ["Там друзьям хорошо вместе", "Там спрятан клад", "Там живёт волшебник"], answer: "Там друзьям хорошо вместе", acceptedAnswers: ["На вилле друзьям уютно вместе", "Это особенный дом, потому что там дружат"], acceptedConcepts: [["друз"], ["вмест", "уют", "друж"]] },
  ]},
] as const;

export function getBook(value: unknown) { return BOOKS.find((book) => book.id === value) ?? BOOKS[0]; }
export function cleanBookReflections(value: unknown): BookReflections {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(BOOKS.flatMap((book) => {
    const raw = source[book.id];
    if (!raw || typeof raw !== "object") return [];
    const reflection = raw as Record<string, unknown>;
    const text = typeof reflection.text === "string" ? reflection.text.slice(0, 3000) : "";
    const savedAt = typeof reflection.savedAt === "string" ? reflection.savedAt.slice(0, 40) : "";
    const completed = Boolean(text.trim() && savedAt);
    const bonusAwardedAt = completed && typeof reflection.bonusAwardedAt === "string" ? reflection.bonusAwardedAt.slice(0, 40) : completed ? savedAt : "";
    return [[book.id, { text, savedAt, bonusStars: completed ? 10 : 0, bonusAwardedAt }]];
  })) as BookReflections;
}
export function cleanRanges(value: unknown, book: Book): ReadingRange[] {
  if (!Array.isArray(value)) return [];
  const ranges = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ from: Math.round(Number(item.from)), to: Math.round(Number(item.to)) }))
    .filter((item) => Number.isFinite(item.from) && Number.isFinite(item.to))
    .map((item) => ({ from: Math.max(book.firstPage, item.from), to: Math.min(book.lastPage, item.to) }))
    .filter((item) => item.from <= item.to).sort((a, b) => a.from - b.from || a.to - b.to);
  return ranges.reduce<ReadingRange[]>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to + 1) previous.to = Math.max(previous.to, range.to); else merged.push({ ...range });
    return merged;
  }, []);
}
export function mergeRanges(existing: ReadingRange[], next: ReadingRange[], book: Book) { return cleanRanges([...existing, ...next], book); }
export function continuousPage(ranges: ReadingRange[], book: Book) { const first = cleanRanges(ranges, book)[0]; return first?.from === book.firstPage ? first.to : book.firstPage - 1; }
export function isBookFinished(ranges: ReadingRange[], book: Book) { return continuousPage(ranges, book) >= book.lastPage; }
export function bookIndex(id: BookId) { return Math.max(0, BOOKS.findIndex((book) => book.id === id)); }
export function nextBook(id: BookId) { return BOOKS[bookIndex(id) + 1] ?? null; }
export function activeQuestion(book: Book, page: number, answered: string[]) { return book.questions.find((question) => question.unlockPage <= page && !answered.includes(question.id)) ?? null; }
function normalizeReadingAnswer(value: string) {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function containsConcept(answer: string, concept: string) {
  const normalized = normalizeReadingAnswer(concept);
  return normalized.length > 2 && answer.includes(normalized);
}

export function isReadingAnswerCorrect(question: ReadingQuestion | undefined, answer: string | undefined) {
  if (!question || !answer?.trim()) return false;
  const normalized = normalizeReadingAnswer(answer);
  const accepted = [question.answer, ...(question.acceptedAnswers ?? [])].map(normalizeReadingAnswer);
  if (accepted.includes(normalized)) return true;
  return Boolean(question.acceptedConcepts?.every((group) => group.some((concept) => containsConcept(normalized, concept))));
}
export function readingQuestionsForRange(book: Book, range: ReadingRange, answered: string[] = []) {
  const available = book.questions.filter((question) => question.unlockPage >= range.from && question.unlockPage <= range.to && !answered.includes(question.id));
  return available.slice(0, 1);
}
export function getReadingQuestion(book: Book, questionId: string) { return book.questions.find((question) => question.id === questionId); }
export function cleanDailyReadingSession(value: unknown, expectedDay: string): DailyReadingSession | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (source.day !== expectedDay || !BOOKS.some((book) => book.id === source.bookId)) return null;
  const book = getBook(source.bookId);
  const from = Math.max(book.firstPage, Math.round(Number(source.from)));
  const to = Math.min(book.lastPage, Math.round(Number(source.to)));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return null;
  const questionIds = readingQuestionsForRange(book, { from, to }).map((question) => question.id);
  const rawAnswers = source.answers && typeof source.answers === "object" ? source.answers as Record<string, unknown> : {};
  const answers = Object.fromEntries(questionIds.map((questionId) => [questionId, typeof rawAnswers[questionId] === "string" ? rawAnswers[questionId].slice(0, 200) : ""]));
  return {
    day: expectedDay,
    bookId: book.id,
    from,
    to,
    minutes: Math.max(15, Math.min(30, Math.round(Number(source.minutes) || 15))),
    questionIds,
    answers,
    finished: Boolean(source.finished),
  };
}
export function isCurrentReadingCorrect(session: DailyReadingSession | null | undefined, expectedDay: string) {
  if (!session || session.day !== expectedDay || session.questionIds.length === 0) return false;
  const book = getBook(session.bookId);
  return session.questionIds.every((questionId) => {
    const question = getReadingQuestion(book, questionId);
    return Boolean(question && question.unlockPage >= session.from && question.unlockPage <= session.to && isReadingAnswerCorrect(question, session.answers[questionId]));
  });
}
export function readingStarCount(session: DailyReadingSession | null | undefined, completed: boolean, expectedDay: string) {
  if (!completed) return 0;
  if (isCurrentReadingCorrect(session, expectedDay)) return 3;
  return (session?.minutes ?? 15) >= 20 ? 2 : 1;
}
