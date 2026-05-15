# Product

A static, client-side Spanish flashcard web application for personal language learning. Intentionally minimal — maximize study time, minimize maintenance time. No backend, no build system, no framework. All content is driven by a single `cards.json` file.

## Target User

A solo learner who wants to study Spanish vocabulary and phrases, add new cards by editing one JSON file, and deploy updates by pushing to GitHub with zero configuration.

## Core Value Proposition

"Edit the JSON, push to GitHub, and the site updates itself. No build step. No maintenance. Just study."

## Primary Goals

- Content-first: Adding a new flashcard = one JSON entry, done
- Zero maintenance: No dependencies to update, no servers, no accounts
- Study-optimized UX: Keyboard navigation, progress memory, weak-card review
- Mobile-friendly: Usable on a phone during commute

## Non-Goals

- Multi-user support or accounts
- Cloud sync
- A content management UI (the JSON file IS the CMS)
- Gamification or spaced repetition algorithms

## Success Criteria

- New card addable in under 60 seconds
- Works offline after first visit (no internet required)
- Progress (known/unknown) persists via localStorage between sessions
- Deployable to GitHub Pages with zero configuration
