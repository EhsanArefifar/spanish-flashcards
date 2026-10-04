# Product

A static, client-side Spanish flashcard web application for personal language learning. Intentionally minimal — maximize study time, minimize maintenance time. No backend, no build system, no framework. All content is driven by a single `cards.json` file.

The learning goal is **speaking fluency in Castilian Spanish**, first of all at work, by producing everyday chunks out loud. Most decks are production cards (prompt → say the Spanish), organised by the tenses that block fluency: perfecto, indefinido, imperfecto, conditional and subjunctive. See `content.md` for the card formats and content rules.

## Target User

A solo learner who studies one group of 10 cards per sitting, saying each answer out loud. Adds new cards by editing one JSON file and deploys updates by pushing to GitHub with zero configuration.

## Core Value Proposition

"Edit the JSON, push to GitHub, and the site updates itself. No build step. No maintenance. Just study."

## Primary Goals

- Content-first: Adding a new flashcard = one JSON entry, done
- Zero maintenance: No dependencies to update, no servers, no accounts
- Study-optimized UX: Keyboard navigation, progress memory, weak-card review, Spanish audio on every card
- Spaced practice without effort: the navigator shows when each group was last practised and marks it ↻ when it's due again
- Mobile-friendly: Usable on a phone during commute

## Non-Goals

- Multi-user support or accounts
- Cloud sync
- A content management UI (the JSON file IS the CMS)
- Gamification, timed modes, or per-card spaced repetition algorithms (group-level review hints only)

## Success Criteria

- New card addable in under 60 seconds
- Works offline after first visit (no internet required)
- Progress (known/unknown) persists via localStorage between sessions
- Deployable to GitHub Pages with zero configuration
