# EduSpots · Funding & Impact Report Generator

![Status: Prototype](https://img.shields.io/badge/status-prototype-orange)

**Project #3 of 5** in the EduSpots operations automation portfolio,
built for the Head of Programme and Product Operations application.

---

## What this is

> *"Leading the monitoring, evaluation and learning, and related data collection, across our Spots, writing reports and contributing to funding proposals."*
> — EduSpots Head of Programme & Product Operations job description

EduSpots reports the same underlying network data to very different audiences — funders who need compliance and accountability, Regional Coordinators (RCs) who need operational detail, and Spot Committees who want plain-language local impact. Right now that likely means re-formatting the same numbers by hand, three times, every reporting cycle.

This tool turns one dataset into three audience-specific report drafts automatically, and makes explicit where automation's job ends and a human's begins.

---

## The human/automation principle — stated prominently

**Automation drafts. A human reviews, edits, and signs off before anything goes out the door.**

- Every generated report carries a visible **"DRAFT — Human review required before sending"** banner — not a footnote, a banner at the top of every generated document.
- Every number and claim in a draft is traceable directly to the underlying dataset. Nothing is invented.
- Where data is genuinely missing for a section, the draft says so plainly (e.g. "No comparison data available for this period") — it never writes around a gap.
- The tool has a "Download as text" and "Copy" action. It does **not** auto-send or auto-publish anything.

---

## Feature breakdown

### Overview
KPI row (total funding tracked, active grants, upcoming deadlines in next 60 days, drafts generated this session, Spots with complete vs. incomplete data), a bar chart of grant amounts by funder colour-coded by status, and a stacked bar chart of reporting data completeness by cluster. The completeness chart applies the same "flag data quality, don't hide it" instinct as Project #1's anomaly detection — applied to reporting completeness instead of Spot health.

### Grant Tracker
Table of grants with funder name, amount, funded clusters, reporting deadline, and status. Three-tier status system (on-track / due soon / overdue), computed transparently in `computeGrantStatus()`. Click any row to open a detail panel showing funded Spots, grant restrictions, and reporting history.

Status rules (transparent, no black-box scoring):
- **Overdue:** reporting deadline has passed with no submission logged.
- **Due soon:** reporting deadline within 30 days.
- **On-track:** none of the above.

### Report Generator
Pick a reporting period, audience (Funder / RC / Spot Committee), and optional cluster or grant filter. Click "Generate draft" for a structured report built entirely from the underlying dataset, with visibly different tone and structure per audience:
- **Funder draft:** formal, outcomes-and-accountability framed, references the specific grant's restrictions.
- **RC draft:** operational, cluster-level detail, flags and actions oriented.
- **Spot Committee draft:** plain-language, community-facing, celebrates local wins, avoids jargon.

Every draft carries the DRAFT banner. Download as `.txt` or copy to clipboard. The tool never claims final-ready status.

### Data Completeness
Lists every Spot with incomplete or missing reporting data, with the **specific reason** per gap (not just a status colour). An "Acknowledge for follow-up" button logs each item for human follow-up. Completeness is computed transparently in `computeDataCompleteness()` across three fields: engagement data, safeguarding data, and financial data.

---

## Design system

Identical tokens to Projects #1 and #2:

```css
--forest: #123524  (sidebar, primary)
--gold:   #D9A62E  (accent, "due soon" status)
--sky:    #3E7CB1  (secondary data colour)
--clay:   #B54834  (overdue/at-risk status only — not decorative)
--paper:  #F6F2E9  (background)
```

Fonts: Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono (IDs, timestamps, generated report text). Sidebar: dark forest green with a Kente-inspired repeating stripe accent on the right edge.

The generated report draft renders on a distinct white/paper card so it reads like a document preview, separate from the dashboard chrome.

---

## Stack

- **Dependency-free:** plain HTML, CSS, and JavaScript. No build step, no npm install.
- **Chart.js** via CDN for charts.
- **Seeded PRNG** (`mulberry32`) for reproducible synthetic data.
- Runs directly in the browser — open `index.html`.

---

## File structure

```
eduspots-funding-reports/
  index.html
  css/styles.css
  js/data.js               Seeded synthetic generator + status rules
  js/real-data.js          Real Spot/RC/network facts (see below)
  js/report-templates.js   Three audience-specific draft generators
  js/charts.js             Chart.js wrappers
  js/app.js                Rendering, nav, filters, modal, generator form
  assets/                  Logo and favicon
  README.md
  LICENSE
  .gitignore
```

---

## What's real vs. synthetic

| Data | Status |
|------|--------|
| Spot names (49) | **Real** — sourced from [eduspots.org](https://eduspots.org/) |
| RC names (4) | **Real** — sourced from [eduspots.org/about-us/team/](https://eduspots.org/about-us/team/) |
| Network totals (52 Spots, 412 Catalysts, 12,000 Sparks, etc.) | **Real** — sourced from EduSpots 2024/2025 published reporting |
| All grant/funder names and amounts | **Synthetic** — entirely invented; do not interpret as real organisations |
| Grant deadlines, restrictions, status | **Synthetic** |
| Per-Spot completeness and operational figures | **Synthetic** — generated from seeded PRNG |

Funder names in this prototype (e.g. "Albright Community Foundation", "Meridian Education Trust") are invented placeholder names. They do not represent real foundations, companies, or donor organisations.

---

## Roadmap

- Integration with a real data source (EduSpots operational database or reporting spreadsheets)
- PDF export for generated drafts
- Multi-cycle comparison (this period vs. prior period)
- Funder-specific report templates per grant requirements
- Narrative quality review checklist before download

---

*Portfolio context: (1) Spot Health & MEL Dashboard — done, (2) Catalyst Onboarding & Induction Pipeline Tracker — done, (3) Funding & Impact Report Generator — this one, (4) Safeguarding Training Compliance Tracker, (5) Resource & Device Distribution Tracker.*
