/**
 * Architecture test for the two directories that belong to downstream sites.
 *
 * A downstream site is a full copy of this repository that keeps its words in
 * `data/words/` and its cards in `public/images/`, and takes each release by
 * merging this repository's `main` (`npm run tool:sync`). Those merges stay
 * clean only while this repository tracks nothing in either directory: one
 * file here would collide with a site's own, or land in every site as content
 * it never added. This repository's own words and cards are the demo's, under
 * `data/demo/` and `public/demo/`.
 *
 * `.gitignore` cannot hold the rule, because the sites get that file too and
 * must track both directories. So this asks Git what is tracked, everywhere
 * except in a checkout it can tell is a site's: the suite runs in every site,
 * in its sync gates and its CI, where tracking them is the point. A site is a
 * checkout with an `upstream` remote (the test `tools/sync-upstream.sh` uses),
 * or one whose GitHub repository is not this one. A checkout it cannot
 * identify is held to the rule, so a failed Git command never skips it.
 */

import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const ENGINE = 'seriouslysean/occasional-wotd';
const UPSTREAM = /[/:]seriouslysean\/occasional-wotd(\.git)?\/?$/i;

const git = (...args: string[]): string => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
};

const GITHUB_REPOSITORY = /github\.com[/:]([^/]+\/[^/]+?)(\.git)?\/?$/;

const origin = git('remote', 'get-url', 'origin');
const hasUpstreamRemote = git('remote').split('\n').includes('upstream');
const isAnotherGitHubRepository = GITHUB_REPOSITORY.test(origin) && !UPSTREAM.test(origin);
// GitHub Actions names the repository itself, whatever the checkout's remote says
const isEngineInCi = process.env.GITHUB_REPOSITORY?.toLowerCase() === ENGINE;
const isSite = !isEngineInCi && (hasUpstreamRemote || isAnotherGitHubRepository);

describe.skipIf(isSite)('Architecture: site content stays out of the engine', () => {
  it.each(['data/words', 'public/images'])('tracks nothing under %s', (directory) => {
    // Proves Git answered: an empty reply from a failed command would pass
    expect(git('ls-files', '--', 'package.json')).toBe('package.json');
    expect(git('ls-files', '--', directory)).toBe('');
  });
});
