# Zero to Claude Code

A curated video path for engineers starting with AI-assisted coding.

Lost and don't know where to start with Claude Code and building software with AI? This is a hand-picked list of YouTube videos, ordered into a learning path you can follow step by step, from "what is an LLM" to real AI coding workflows.

> **Status:** work in progress. The site will be live at **https://brahmed.github.io/zero-to-claude-code/**.

## What you get

- **A skill tree, RPG style:** five skills, from LLM Foundations to the big picture. Master a skill by watching its core videos ("quests") to unlock the next ones, and level up from Novice to Architect. Locked skills can still be opened. Long deep dives are optional bonus quests.
- **Browse and filter:** by the time you have (≤10 min, 10–30, 30+), by type (foundation, general, Claude Code) and by YouTuber.
- **Progress tracking:** mark videos as watched. Your progress stays in your own browser: no account, nothing sent anywhere.

## How it's built

A small static site: plain HTML, CSS and JavaScript, with one `data/videos.json` data file. No frameworks, no build step, no dependencies, no analytics.

### Run locally

```sh
python3 -m http.server
```

Then open http://localhost:8000. The page loads `data/videos.json` with `fetch`, so it must be served over HTTP rather than opened as a file.

### Add a video

Add an entry to the `videos` array in `data/videos.json`, at the position where it belongs in the path:

```json
{
  "id": "YOUTUBE_VIDEO_ID",
  "title": "Video title",
  "channel": "Channel name",
  "minutes": 12,
  "published": "2025-01-31",
  "step": 2,
  "type": "claude-code",
  "depth": "core",
  "why": "One line on why it is worth watching.",
  "notes": ["Includes promotional segments."],
  "rating": null
}
```

- `type`: `foundation`, `general` or `claude-code`
- `depth`: `core` (counts toward the core path time) or `deep` (optional deep dive)
- `step`: the id of an entry in `steps`
- `rating`: the curator's rating, 1–5, or `null` (nothing is shown)
- The thumbnail is derived from the `id`.

### Project structure

```
index.html            page shell
css/style.css         styles (light and dark)
js/skills.js          pure skill-tree logic (states, levels); no DOM, no storage
js/app.js             UI: rendering, filters, progress in localStorage
data/videos.json      steps (skills) and the curated videos
tests/skills.test.js  unit tests for the logic and data integrity
```

### Run the tests

```sh
node --test
```

Requires Node 18+. No dependencies to install.

## Disclaimer

Unofficial and community-curated. Not affiliated with Anthropic. All videos belong to their creators; this site only links to them.

## License

[MIT](LICENSE)
