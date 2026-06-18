# Play Scoring Guide

A browser-based tool for a theater board to **organize, rank, and research plays**
under consideration for upcoming seasons. It runs entirely in the browser — no
server or database — and persists all data in `localStorage`, so it survives a
page refresh.

## Features

- **Play entry & management** — add plays with title, playwright, genre, year,
  runtime, cast size, and staging notes, plus an 8-category scoring rubric
  (each 1–10). Edit or delete any play. Import a CSV of already-scored plays with
  column mapping.
- **Ranked dashboard** — plays sorted by total score (descending), with filters
  (genre, cast size, runtime, minimum score), color-coded score badges
  (green / yellow / red), expandable rows showing the full scoring breakdown and
  research, and a summary card (total plays, top play, average score, research
  completed).
- **AI market research** — a "Run Research" button per play (and a "Research All"
  batch with a progress bar) that uses the Anthropic API (`claude-sonnet-4-6`)
  with the web-search tool to surface licensing/royalty costs, recent production
  history, audience reception, and production complexity. Results are saved per
  play with a timestamp.
- **Board report export** — generate a professionally formatted PDF with a cover
  page (theater name + date), ranked list, per-play scoring tables, and research
  summaries. Optionally limit to the top N plays.
- **Settings** — theater name, season year, Anthropic API key, editable scoring
  category labels and weights, and a reset-all-data option.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # build a static production bundle into dist/
npm run preview  # preview the production build
```

## Using AI research

1. Open **Settings** and paste your Anthropic API key (it is stored only in your
   browser's `localStorage` and sent directly to the Anthropic API — nowhere
   else).
2. Go to the **Research** tab and click **Run Research** on a play, or
   **Research All** to queue every play.

The app calls the Anthropic Messages API directly from the browser using the
`anthropic-dangerous-direct-browser-access` header.

## Tech stack

- React + Vite
- Tailwind CSS (deep blue `#1B4F8A` primary, medium blue `#2E75B6` accent)
- PapaParse (CSV import)
- jsPDF + jspdf-autotable (PDF export)
- Anthropic API with the web-search tool (market research)
