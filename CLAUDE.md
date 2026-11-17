# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Zero to Claude Code": a public, open-source static site (GitHub Pages, `https://brahmed.github.io/zero-to-claude-code/`) that presents curated YouTube videos as an RPG-style skill tree for learning Claude Code and AI-assisted engineering. Only the repo owner curates videos. All copy is English.

Keep it simple: plain HTML/CSS/JS, no frameworks, no build step, no npm dependencies, no backend, no analytics. The only external resources are Google Fonts and YouTube thumbnails/links. Push back on anything that adds accounts, a server, a bundler or a database.

## Commands

```sh
python3 -m http.server 8000                  # serve locally (fetch fails over file://)
node --test                                  # all tests (Node 18+ built-in runner, no deps)
node --test --test-name-pattern="soft lock"  # a single test, by name
node --check js/app.js js/skills.js          # syntax check
```

There is no linter and no package.json.

## Architecture

- **Layout:** `index.html` must stay at the repo root, because GitHub Pages serves from `main` at the root. Next to it are `data/`, `css/`, `js/` and `tests/`. Scripts are classic, not ES modules, and load in order: `js/skills.js`, then `js/app.js`.
- **`data/videos.json` is the only content source.**
  - `steps` are the skills. Each has `id`, `title`, `subtitle` and `requires`, a list of prerequisite skill ids. The tree's shape comes only from `requires`, so adding or rewiring a skill needs no code change.
  - `videos` are listed in path order. Each has `step`, `type` (`foundation` | `general` | `claude-code`), `depth` (`core` | `deep`), `why`, `notes[]` and `rating`.
  - The thumbnail URL is derived from the video `id`.
- **`js/skills.js`** holds the game rules: `computeSkills`, `levelOf`, `levelName`, `depthMap` and `LEVELS`.
  - It touches neither the DOM nor storage, and exposes itself as `window.Skills` in the browser and through `module.exports` under Node.
  - `tests/skills.test.js` tests it directly, and also checks the data in `data/videos.json`: steps and prerequisites exist, ids are unique, and `type` and `depth` values are valid. Any rule change goes here, with a test.
- **`js/app.js`** is the UI only: the header (level card), the Skill tree tab, the selected-skill panel, the Browse tab (filters), and the toast.
- **Game rules**, all derived from `videos.json`, never hard-coded:
  - A core video is a "quest"; a `deep` video is a "bonus quest" and doesn't count toward mastery or level.
  - A skill is **mastered** when all its core videos are watched, and **locked** while any skill in `requires` is not mastered.
  - Level = the number of mastered skills, mapped to the names Novice … Architect.
  - Locking is *soft*: locked skills can still be opened and their videos watched.
- **Tree layout:**
  - Each skill's row is its `depthMap` depth: 1 + the deepest of its `requires`.
  - JS positions the nodes from the container width and redraws on resize and on tab show.
  - A single inline SVG draws the connectors behind the nodes: solid when the parent is mastered, dashed otherwise.
- **Progress** is per visitor, saved only in `localStorage` under the key `z2cc:watched` (an array of video ids). Every access is wrapped in try/catch. Nothing about visitors is ever stored in the repo.
- **DOM safety:** data from `videos.json` is inserted with `textContent` and `createElement`, never `innerHTML`.
- **Look:**
  - All colors are CSS variables on `:root` in `css/style.css`, with dark overrides under `prefers-color-scheme: dark`.
  - Fonts: Space Grotesk for headings and numbers, Inter for body text.
  - The accent is indigo `#4338CA`. Don't use Anthropic's brand colors or logo: the site is unofficial and must not look official. The footer disclaimer stays.
  - The UI must work at 360px width with no horizontal scroll.

## Adding a video

1. The owner provides a YouTube link.
2. Get the metadata without API keys or extra tools: `curl -sL -A "Mozilla/5.0" -H "Accept-Language: en-US"` the watch page and parse `ytInitialPlayerResponse`. Its `videoDetails` holds the title, author and `lengthSeconds`; its `microformat.playerMicroformatRenderer` holds `publishDate`.
3. Propose the `step`, `type`, `depth` and a one-line `why` for the owner to approve before editing `data/videos.json`. Run `node --test` afterwards: the data checks catch a wrong `step` or a duplicate id.
4. Conventions:
   - `rating` stays `null` until the owner has watched the video and rated it.
   - Use `notes` for neutral facts only: `"Includes promotional segments."`, and `"Hands-on tutorial: the Claude Code interface may have changed since recording."` on tutorials older than about 6 months.
   - Don't store view counts; they go stale.

## Public-repo hygiene

Commit as `brahmed <58092315+brahmed@users.noreply.github.com>`, already set in the local git config. The remote uses the SSH host alias `github.com-personal` (`git@github.com-personal:brahmed/zero-to-claude-code.git`). Plain `github.com` on this machine logs in as a different account, so don't change the remote. Before every commit, scan the staged files for personal emails, local paths (`/Users/…`), keys and tokens. Videos, transcripts and company or team names never go in the repo.
