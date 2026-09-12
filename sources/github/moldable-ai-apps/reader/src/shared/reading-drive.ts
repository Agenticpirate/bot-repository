export interface ReaderCursor {
  bookId: string
  chapterIndex: number
  wordIndex: number
}

export interface ReaderPassage {
  id: string
  bookId: string
  bookTitle: string
  chapterIndex: number
  chapterTitle: string
  text: string
  wordCount: number
  cursor: ReaderCursor
  nextCursor: ReaderCursor | null
}

export interface ReaderPassageResult {
  book: {
    id: string
    title: string
    author: string | null
  }
  position: ReaderCursor
  passage: ReaderPassage | null
  completed: boolean
  intentId?: string
}
