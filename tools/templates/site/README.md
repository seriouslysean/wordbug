# Word of the Day

A word-of-the-day site built by [occasional-wotd](https://github.com/seriouslysean/occasional-wotd). This repository holds only the site's content and two workflows; the code comes from occasional-wotd at the release both workflows pin.

```text
data/words/YYYY/YYYYMMDD.json      # One word per date
public/images/social/              # Social cards and .image-settings-hash, written by Add Word
public/favicon.svg                 # The site's icon
.github/workflows/deploy.yml       # Calls Site Deploy
.github/workflows/add-word.yml     # Calls Site Add Word
.github/dependabot.yml             # Groups engine updates into one pull request
.env.example                       # Every setting, for local development
```

## Setup

Push this directory to `main` of a public repository, then set it up under **Settings**:

1. **Secrets and variables > Actions > Variables**: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_ID` and `DICTIONARY_ADAPTER` (`wordnik`, `merriam-webster` or `wiktionary`); `BASE_PATH` when the site is served from a subdirectory, such as `/repo` for `username.github.io/repo`; `SITE_TZ` when the site's day is not `America/New_York`; anything else from `.env.example` that should differ from its default. Leave `SOURCE_DIR` unset.
2. **Secrets and variables > Actions > Secrets**: the API key for each dictionary the site uses (`WORDNIK_API_KEY`, `MERRIAM_WEBSTER_API_KEY`), and any `GA_*` or `SENTRY_*` settings. API keys, `GA_*` and `SENTRY_*` are secrets; everything else is a variable. Deploy receives only the GA and Sentry build settings, while Add Word receives only the dictionary keys plus `SENTRY_ENABLED` and `SENTRY_DSN`.
3. **Pages > Build and deployment > Source**: GitHub Actions.
4. **Environments > github-pages**: deployment branches allow `main`.
5. **Actions > General > Actions permissions**: if actions are restricted, allow the reusable workflows of `seriouslysean/occasional-wotd`.
6. **Rules** or branch protection on `main`: let a push from the workflow's `GITHUB_TOKEN` through, since Add Word commits straight to `main`.

The push to `main` starts Deploy; if it ran before the settings were in place, run **Deploy to GitHub Pages** again from the Actions tab.

Then run **Add Word** from the Actions tab with a word. It should commit `Add word: <word>` to `main` with the word's file and the social cards, and the Deploy it starts should publish the site with that word. That run is the check that the whole setup works.

## Updating the engine

Both workflows pin the same occasional-wotd release in their `uses:` line. Dependabot checks weekly and opens one pull request for a new release; merge it once both lines name the same release. Pin a release tag (`vX.Y.Z`) or a full commit SHA, never a branch or a major tag like `v3`, which moves and would change the engine this site runs without a pull request to review. The engine at the pin runs with this repository's secrets and a token that can write to it, so pin only occasional-wotd releases you trust.

## Local development

Clone occasional-wotd into a sibling directory that is only used for this, check out the release in the workflows' `uses:` lines, and install it once:

```sh
git clone https://github.com/seriouslysean/occasional-wotd.git ../site-engine
(cd ../site-engine && git checkout vX.Y.Z && npm ci)
```

Copy `.env.example` to `.env` and fill it in. Then, from this directory, copy the content into the engine and start the dev server:

```sh
(
  site_dir="$PWD"
  cd ../site-engine
  rsync -a --checksum --delete "$site_dir/data/" data/
  rsync -a --checksum --delete --filter='P /favicon.svg' "$site_dir/public/" public/
  SOURCE_DIR= node --env-file-if-exists="$site_dir/.env" node_modules/astro/bin/astro.mjs dev
)
```

Run it again after changing the content. The copy replaces the engine's demo content, so do not use a checkout you work on.
