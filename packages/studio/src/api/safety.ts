import { isSafeBookId as isSafeCoreBookId } from "@actalk/jiaos-core";

/** Validates bookId for API inputs and filesystem-backed book operations. */
export function isSafeBookId(bookId: unknown): bookId is string {
  return isSafeCoreBookId(bookId);
}
