import { SITE_TITLE, SITE_DESCRIPTION, SITE_LOCALE } from 'astro:env/client';
import rss from '@astrojs/rss';
import { escapeText } from 'entities';
import { allWords, extractWordDefinition } from '#astro-utils/word-data-utils';
import { getFullUrl, getWordUrl } from '#astro-utils/url-utils';
import { YYYYMMDDToDate } from '#utils/date-utils';
import { withoutTrailingSlash } from '#utils/url-utils';
import { RSS_FEED_WORD_COUNT } from '#constants/text-patterns';

export function GET() {

  // Get the latest words for RSS feed (2 weeks worth if daily)
  const latestWords = allWords.slice(0, RSS_FEED_WORD_COUNT);

  const rssUrl = getFullUrl('/rss.xml');

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // The channel link is the site's home page. Astro's `site` has no
    // BASE_PATH, so it would point a subdirectory deployment at the domain root.
    site: getFullUrl('/'),
    items: latestWords.map(word => {
      const { definition, partOfSpeech } = extractWordDefinition(word);
      const wordUrl = getFullUrl(getWordUrl(word.word));
      const pubDate = YYYYMMDDToDate(word.date);

      if (!pubDate) {
        throw new Error(`Invalid date format for word ${word.word}: ${word.date}`);
      }

      // Simple format: (part of speech) definition, already plain text
      const description = escapeText(`(${partOfSpeech}) ${definition}`);

      return {
        title: word.word,
        description,
        link: wordUrl,
        pubDate,
        // A reader keys an item by its guid, and the serializer copies the
        // link into it. The link gained a trailing slash in 3.27.0; the guid
        // keeps the string it had before, so no reader takes old items for new.
        customData: `<guid isPermaLink="true">${withoutTrailingSlash(wordUrl)}</guid>`,
      };
    }),
    customData: `<language>${SITE_LOCALE.toLowerCase()}</language>
<atom:link href="${rssUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>`,
  });
}
