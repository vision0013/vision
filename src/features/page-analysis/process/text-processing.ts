import { MAX_TEXT_LEN } from '../config/constants';

export function normText(s: string | null | undefined): string {
  return (s || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LEN);
}