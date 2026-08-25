export type BookId = "emerald" | "urfin" | "pippi";
export type ReadingRange = { from: number; to: number };

export type Book = {
  id: BookId;
  title: string;
  isbn: string;
  firstPage: number;
  lastPage: number;
};

export const BOOKS: readonly Book[] = [
  { id: "emerald", title: "Волшебник Изумрудного города", isbn: "978-5-699-99047-4", firstPage: 5, lastPage: 288 },
  { id: "urfin", title: "Урфин Джюс и его деревянные солдаты", isbn: "978-5-699-96357-7", firstPage: 5, lastPage: 248 },
  { id: "pippi", title: "Пеппи Длинныйчулок поселяется на вилле «Курица»", isbn: "978-5-389-10686-4", firstPage: 5, lastPage: 125 },
] as const;

export function getBook(value: unknown): Book {
  return BOOKS.find((book) => book.id === value) ?? BOOKS[0];
}

export function cleanRanges(value: unknown, book: Book): ReadingRange[] {
  if (!Array.isArray(value)) return [];
  const prepared = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ from: Math.round(Number(item.from)), to: Math.round(Number(item.to)) }))
    .filter((item) => Number.isFinite(item.from) && Number.isFinite(item.to))
    .map((item) => ({ from: Math.max(book.firstPage, item.from), to: Math.min(book.lastPage, item.to) }))
    .filter((item) => item.from <= item.to)
    .sort((left, right) => left.from - right.from || left.to - right.to);

  return prepared.reduce<ReadingRange[]>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to + 1) previous.to = Math.max(previous.to, range.to);
    else merged.push({ ...range });
    return merged;
  }, []);
}

export function mergeRanges(existing: ReadingRange[], next: ReadingRange[], book: Book) {
  return cleanRanges([...existing, ...next], book);
}

export function continuousPage(ranges: ReadingRange[], book: Book) {
  const first = ranges[0];
  return first?.from === book.firstPage ? first.to : book.firstPage - 1;
}

export function isBookFinished(ranges: ReadingRange[], book: Book) {
  return continuousPage(ranges, book) >= book.lastPage;
}
