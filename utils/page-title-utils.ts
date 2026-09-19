import type { WordData } from '#types';
import { formatDate } from '#utils/date-utils';

export const formatPageTitle = (
  title: string | undefined,
  word: WordData | undefined,
  defaultTitle: string,
  siteName: string,
): string => {
  const baseTitle = title && (!word || title !== word.word)
    ? `${title} | ${siteName}`
    : defaultTitle;

  return word ? `${word.word}, ${formatDate(word.date)} - ${baseTitle}` : baseTitle;
};
