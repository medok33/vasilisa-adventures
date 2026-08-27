export type BookId = "emerald" | "urfin" | "pippi";
export type ReadingRange = { from: number; to: number };
export type BookProgress = Partial<Record<BookId, ReadingRange[]>>;
export type ReadingQuestion = { id: string; unlockPage: number; prompt: string };
export type Book = { id: BookId; title: string; isbn: string; firstPage: number; lastPage: number; questions: ReadingQuestion[] };

export const BOOKS: readonly Book[] = [
  { id: "emerald", title: "Волшебник Изумрудного города", isbn: "978-5-699-99047-4", firstPage: 5, lastPage: 288, questions: [
    { id: "em-1", unlockPage: 40, prompt: "Почему Элли решилась отправиться в Изумрудный город?" },
    { id: "em-2", unlockPage: 90, prompt: "Как новый спутник помог друзьям в прочитанной части?" },
    { id: "em-3", unlockPage: 145, prompt: "Какое решение героев показалось тебе самым смелым и почему?" },
    { id: "em-4", unlockPage: 205, prompt: "Что герои узнали о себе во время пути?" },
    { id: "em-5", unlockPage: 288, prompt: "Чему, по-твоему, учит всё путешествие Элли?" },
  ]},
  { id: "urfin", title: "Урфин Джюс и его деревянные солдаты", isbn: "978-5-699-96357-7", firstPage: 5, lastPage: 248, questions: [
    { id: "ur-1", unlockPage: 30, prompt: "Как необыкновенное растение изменило планы Урфина?" },
    { id: "ur-2", unlockPage: 73, prompt: "Почему Изумрудному городу понадобилась помощь?" },
    { id: "ur-3", unlockPage: 122, prompt: "Что помогло героям выбраться из опасности?" },
    { id: "ur-4", unlockPage: 182, prompt: "Какая встреча в прочитанной части была самой важной?" },
    { id: "ur-5", unlockPage: 218, prompt: "Почему одному человеку трудно управлять только страхом?" },
    { id: "ur-6", unlockPage: 248, prompt: "Как изменился Урфин к концу истории?" },
  ]},
  { id: "pippi", title: "Пеппи Длинныйчулок поселяется на вилле «Курица»", isbn: "978-5-389-10686-4", firstPage: 5, lastPage: 125, questions: [
    { id: "pi-1", unlockPage: 25, prompt: "Чем Пеппи удивила Томми и Аннику при знакомстве?" },
    { id: "pi-2", unlockPage: 45, prompt: "Как Пеппи поступила в ситуации, где взрослые ждали другого поведения?" },
    { id: "pi-3", unlockPage: 65, prompt: "Какой поступок Пеппи был смешным, но добрым?" },
    { id: "pi-4", unlockPage: 85, prompt: "Что друзьям нравится в Пеппи больше всего?" },
    { id: "pi-5", unlockPage: 105, prompt: "Когда сила Пеппи помогла не только ей самой?" },
    { id: "pi-6", unlockPage: 125, prompt: "Почему вилла «Курица» стала особенным местом для друзей?" },
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
