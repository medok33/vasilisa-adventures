export type BookId = "emerald" | "urfin" | "pippi";
export type ReadingRange = { from: number; to: number };
export type BookProgress = Partial<Record<BookId, ReadingRange[]>>;
export type ReadingQuestion = {
  id: string;
  fromPage: number;
  unlockPage: number;
  prompt: string;
  options: readonly string[];
  answer: string;
};
export type Book = { id: BookId; title: string; isbn: string; firstPage: number; lastPage: number; questions: ReadingQuestion[] };

export const BOOKS: readonly Book[] = [
  { id: "emerald", title: "Волшебник Изумрудного города", isbn: "978-5-699-99047-4", firstPage: 5, lastPage: 288, questions: [
    { id: "em-1", fromPage: 5, unlockPage: 40, prompt: "Кого Элли встретила первым в дороге из необычных спутников?", options: ["Страшилу", "Урфина Джюса", "Капитана Крюка"], answer: "Страшилу" },
    { id: "em-2", fromPage: 41, unlockPage: 90, prompt: "О чём больше всего мечтал Железный Дровосек?", options: ["О сердце", "О новом топоре", "О золотой короне"], answer: "О сердце" },
    { id: "em-3", fromPage: 91, unlockPage: 145, prompt: "Какое качество особенно хотел получить Лев?", options: ["Смелость", "Невидимость", "Умение летать"], answer: "Смелость" },
    { id: "em-4", fromPage: 146, unlockPage: 205, prompt: "К кому друзья шли за помощью в Изумрудном городе?", options: ["К Гудвину", "К Урфину", "К Бастинде"], answer: "К Гудвину" },
    { id: "em-5", fromPage: 206, unlockPage: 288, prompt: "Что помогло Элли вернуться домой?", options: ["Серебряные башмачки", "Воздушный шар", "Корабль"], answer: "Серебряные башмачки" },
  ]},
  { id: "urfin", title: "Урфин Джюс и его деревянные солдаты", isbn: "978-5-699-96357-7", firstPage: 5, lastPage: 248, questions: [
    { id: "ur-1", fromPage: 5, unlockPage: 30, prompt: "Что Урфин нашёл необычного после бури?", options: ["Живительный порошок", "Карту сокровищ", "Волшебную корону"], answer: "Живительный порошок" },
    { id: "ur-2", fromPage: 31, unlockPage: 73, prompt: "Из чего Урфин сделал своих первых солдат?", options: ["Из дерева", "Из железа", "Из камня"], answer: "Из дерева" },
    { id: "ur-3", fromPage: 74, unlockPage: 122, prompt: "Как звали механического медведя, который помогал друзьям?", options: ["Топотун", "Артошка", "Громобой"], answer: "Топотун" },
    { id: "ur-4", fromPage: 123, unlockPage: 182, prompt: "Кому друзья решили помочь освободить Изумрудный город?", options: ["Страшиле", "Бастинде", "Людоеду"], answer: "Страшиле" },
    { id: "ur-5", fromPage: 183, unlockPage: 218, prompt: "Почему деревянные солдаты слушались Урфина?", options: ["Он оживил их порошком", "Он платил им деньгами", "Они были его соседями"], answer: "Он оживил их порошком" },
    { id: "ur-6", fromPage: 219, unlockPage: 248, prompt: "Что стало главным итогом победы героев?", options: ["Изумрудный город освободили", "Герои нашли клад", "Все уехали из страны"], answer: "Изумрудный город освободили" },
  ]},
  { id: "pippi", title: "Пеппи Длинныйчулок поселяется на вилле «Курица»", isbn: "978-5-389-10686-4", firstPage: 5, lastPage: 125, questions: [
    { id: "pi-1", fromPage: 5, unlockPage: 25, prompt: "Как называется дом, в котором живёт Пеппи?", options: ["Вилла «Курица»", "Изумрудный дворец", "Дом у моря"], answer: "Вилла «Курица»" },
    { id: "pi-2", fromPage: 26, unlockPage: 45, prompt: "Как зовут друзей Пеппи по соседству?", options: ["Томми и Анника", "Элли и Тотошка", "Винни и Пятачок"], answer: "Томми и Анника" },
    { id: "pi-3", fromPage: 46, unlockPage: 65, prompt: "Какое домашнее животное есть у Пеппи?", options: ["Лошадь", "Тигр", "Кролик"], answer: "Лошадь" },
    { id: "pi-4", fromPage: 66, unlockPage: 85, prompt: "Почему Пеппи часто удивляет взрослых?", options: ["Она делает всё по-своему", "Она боится говорить", "Она никогда не смеётся"], answer: "Она делает всё по-своему" },
    { id: "pi-5", fromPage: 86, unlockPage: 105, prompt: "Как Пеппи относится к своим друзьям?", options: ["Заботится и защищает", "Не замечает их", "Командует ими"], answer: "Заботится и защищает" },
    { id: "pi-6", fromPage: 106, unlockPage: 125, prompt: "Что делает виллу «Курица» особенным местом?", options: ["Там друзьям хорошо вместе", "Там спрятан клад", "Там живёт волшебник"], answer: "Там друзьям хорошо вместе" },
  ]},
] as const;

export function getBook(value: unknown) { return BOOKS.find((book) => book.id === value) ?? BOOKS[0]; }
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
export function isReadingAnswerCorrect(question: ReadingQuestion | undefined, answer: string | undefined) { return Boolean(question && answer?.trim() === question.answer); }
export function hasCorrectReadingAnswer(book: Book, answers: Record<string, string> | undefined) {
  return book.questions.some((question) => isReadingAnswerCorrect(question, answers?.[question.id]));
}
export function readingStarCount(book: Book, answers: Record<string, string> | undefined, minutes: number, completed: boolean) {
  if (!completed) return 0;
  if (hasCorrectReadingAnswer(book, answers)) return 3;
  return minutes >= 20 ? 2 : 1;
}
