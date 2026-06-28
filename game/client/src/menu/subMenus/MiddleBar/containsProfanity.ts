import filter from "leo-profanity";
import { Filter } from "bad-words";

const FilterB = new Filter();

export function containsProfanity(word: string) {
  const filteredWord = word.replace(/_/g, " ");

  if (FilterB.isProfane(filteredWord) || filter.check(filteredWord)) {
    return true;
  }

  const noSpaceWord = filteredWord.replace(/\s/g, "");
  if (FilterB.isProfane(noSpaceWord) || filter.check(noSpaceWord)) {
    return true;
  }
  return false;
}
