# Implementation Plan: Spanish Flashcard App

## Overview

Implement a zero-dependency, static Spanish flashcard SPA using vanilla HTML5, CSS, and JavaScript (ES2020+). Files are created in dependency order: data → markup → styles → logic → tests → docs.

## Tasks

- [ ] 1. Create `cards.json` with sample content
  - Write a top-level `decks` array with at least 3 decks across 2 categories
  - Each deck must have `category`, `subcategory`, and a `cards` array
  - Include at least 5 cards per deck; mix cards with and without `example`/`translation` fields
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 13.1_

- [ ] 2. Create `index.html` structural shell
  - Write semantic HTML5 with `<header>`, `<nav id="navigator">`, `<main id="viewport">`, `<div id="error-message">`
  - Include `<link rel="stylesheet" href="style.css">` and `<script defer src="app.js">`
  - Scaffold static DOM regions: deck header (subcategory name, Review Weak Cards button, Shuffle toggle), card element with `.card__inner`, `.card__front`, `.card__back` divs, controls bar (Prev, Next, Known, Still Learning, speaker icon), progress indicator, deck-complete screen, Reset Progress button
  - No hardcoded card or deck content — all dynamic regions left empty for JS to populate
  - _Requirements: 1.5, 3.5, 3.6, 4.3, 5.1, 6.1, 7.4, 8.1, 9.1, 10.1, 13.1_

- [ ] 3. Create `style.css` with full visual design
  - [ ] 3.1 Define CSS custom properties at `:root` for all colors, spacing, and radii
    - Include `--color-primary`, `--color-bg`, `--color-card`, `--color-text`, `--color-known`, `--color-learning`, `--color-border`, `--radius-card`
    - _Requirements: 12.4_

  - [ ] 3.2 Implement mobile-first layout with CSS Grid/Flexbox
    - Base styles target 375px viewport; navigator collapses to a toggle-accessible panel by default
    - `@media (min-width: 768px)` breakpoint expands navigator into a sidebar
    - All interactive buttons must have `min-width: 44px; min-height: 44px`
    - Base `font-size: 16px` on body
    - _Requirements: 12.1, 12.3, 12.4, 12.5_

  - [ ] 3.3 Implement CSS 3D card flip animation
    - `.card` sets `perspective`; `.card__inner` uses `transform-style: preserve-3d` and `transition: transform 300ms–500ms`
    - `.card__front` and `.card__back` use `backface-visibility: hidden`; `.card__back` starts at `rotateY(180deg)`
    - `.card--flipped .card__inner` applies `rotateY(180deg)`
    - _Requirements: 4.3, 4.4_

  - [ ] 3.4 Style all BEM component classes
    - `.nav`, `.nav__category`, `.nav__category--open`, `.nav__subcategory`, `.nav__subcategory--active`
    - `.btn`, `.btn--known`, `.btn--learning`, `.btn--disabled`
    - `.badge`, `.badge--known`, `.badge--learning`
    - `body.no-speech` hides the speaker icon button
    - _Requirements: 2.4, 6.1, 6.2, 9.4, 10.3_

- [ ] 4. Implement `app.js` — state object and pure data functions
  - [ ] 4.1 Define the `state` object and `generateCardId` function
    - Declare `const state` with all fields: `decks`, `activeDeck`, `activeDeckIndex`, `displayCards`, `currentIndex`, `isFlipped`, `isShuffled`, `isReviewMode`, `progress`
    - Implement `generateCardId(deckIndex, cardIndex)` returning `"deck-${deckIndex}-card-${cardIndex}"`
    - _Requirements: 7.1, 7.3_

  - [ ]* 4.2 Write property test for `generateCardId` (Property 7)
    - **Property 7: Card ID stability** — same inputs always produce same output
    - **Validates: Requirements 7.1, 7.3**

  - [ ] 4.3 Implement `shuffleDeck(cards)` using Fisher-Yates
    - Must return a new array (do not mutate the input)
    - _Requirements: 8.2_

  - [ ]* 4.4 Write property tests for `shuffleDeck` (Properties 2 & 3)
    - **Property 2: Shuffle preserves deck contents** — same elements, no additions or removals
    - **Property 3: Shuffle then unshuffle restores original order** — original reference unchanged
    - **Validates: Requirements 8.2, 8.4**

  - [ ] 4.5 Implement `getWeakCards(deck, progress)` and `deriveDisplayCards()`
    - `getWeakCards` filters cards to those whose Card_ID maps to `"learning"` in progress
    - `deriveDisplayCards` returns full deck order when shuffle and review are off; shuffled order when `isShuffled`; filtered list when `isReviewMode`
    - _Requirements: 9.3, 8.3_

  - [ ]* 4.6 Write property test for `getWeakCards` (Property 5)
    - **Property 5: Review mode filters correctly** — only `"learning"` cards returned
    - **Validates: Requirements 9.3**

- [ ] 5. Implement `app.js` — initialization and progress persistence
  - [ ] 5.1 Implement `loadProgressFromStorage()` and `initApp()`
    - `loadProgressFromStorage` reads `"flashcard-progress"` from localStorage (wrapped in try/catch), parses JSON into `state.progress`
    - `initApp` calls `fetch('cards.json')`, on success sets `state.decks`, calls `loadProgressFromStorage`, then `renderNavigator` and `activateFirstDeck`; on failure calls `renderError`
    - _Requirements: 1.1, 1.2, 1.3, 7.2_

  - [ ]* 5.2 Write property test for progress round-trip (Property 1)
    - **Property 1: Progress round-trip** — serialize to localStorage then read back produces identical map
    - **Validates: Requirements 7.1, 7.2**

- [ ] 6. Implement `app.js` — rendering functions
  - [ ] 6.1 Implement `renderNavigator()`
    - Build category/subcategory tree from `state.decks`; attach `data-deck-index` to subcategory items
    - Show `.badge--known` / `.badge--learning` counts per deck derived from `state.progress`
    - Apply `.nav__subcategory--active` to the active deck entry
    - _Requirements: 2.1, 2.4, 2.5, 6.5_

  - [ ] 6.2 Implement `renderCard()`
    - Populate `.card__front` with `front` text and speaker button
    - Populate `.card__back` with `back` text; conditionally append `example` and `translation` paragraphs when present
    - Toggle `.card--flipped` on `.card` based on `state.isFlipped`
    - Enable/disable Known and Still Learning buttons based on `state.isFlipped`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2_

  - [ ]* 6.3 Write property tests for card face display (Properties 9 & 10)
    - **Property 9: Known/Still Learning buttons match flip state**
    - **Property 10: Card face display matches flip state** — front text when unflipped, back + optional fields when flipped
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.1, 6.2**

  - [ ] 6.4 Implement `renderProgressIndicator()`, `renderDeckComplete()`, and `renderError(msg)`
    - Progress indicator shows "Card N of M" using `currentIndex + 1` and `displayCards.length`
    - Deck complete screen shows Restart and Review Weak Cards buttons
    - Error region shown with human-readable message; navigator and viewport hidden
    - _Requirements: 1.3, 3.5, 5.5, 5.6, 5.7, 9.2_

- [ ] 7. Implement `app.js` — state mutations
  - [ ] 7.1 Implement `activateDeck(deckIndex)`, `flipCard()`, and `navigateCard(direction)`
    - `activateDeck` sets `activeDeck`, `activeDeckIndex`, resets `currentIndex`, `isFlipped`, `isShuffled`, `isReviewMode`, calls `deriveDisplayCards` then renders
    - `flipCard` toggles `state.isFlipped` then calls `renderCard`
    - `navigateCard(+1/-1)` advances/retreats `currentIndex`; resets `isFlipped` to `false`; shows deck-complete screen when past last card
    - _Requirements: 2.3, 4.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property test for navigation resetting flip state (Property 8)
    - **Property 8: Navigation resets flip state** — `state.isFlipped` is `false` after any navigate call
    - **Validates: Requirements 5.4**

  - [ ] 7.3 Implement `markCard(status)`, `resetProgress()`
    - `markCard` sets `state.progress[cardId]` to `"known"` or `"learning"`, serializes entire progress object to localStorage under `"flashcard-progress"` (try/catch)
    - `resetProgress` removes `"flashcard-progress"` from localStorage, clears `state.progress`, re-renders
    - _Requirements: 6.3, 6.4, 6.6, 7.1, 7.4, 7.5_

  - [ ]* 7.4 Write property test for mark card overwriting previous status (Property 6)
    - **Property 6: Mark card overwrites previous status** — only the new status persists in `state.progress`
    - **Validates: Requirements 6.3, 6.4, 6.6**

  - [ ] 7.5 Implement `toggleShuffle()` and `activateReviewMode()`
    - `toggleShuffle` flips `state.isShuffled`; when activating, calls `shuffleDeck` and stores result in `displayCards`; when deactivating, restores original order via `deriveDisplayCards`
    - `activateReviewMode` sets `state.isReviewMode = true`, calls `getWeakCards`, updates `displayCards`, resets `currentIndex` and `isFlipped`
    - _Requirements: 8.2, 8.3, 8.4, 9.3, 9.4_

- [ ] 8. Checkpoint — wire state mutations to rendering
  - Ensure `activateDeck`, `navigateCard`, `flipCard`, `markCard`, `toggleShuffle`, `activateReviewMode`, and `resetProgress` each call the appropriate render functions after mutating state
  - Verify Review Weak Cards button gets `disabled` attribute + `.btn--disabled` + `title` tooltip when no `"learning"` cards exist in active deck
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 9.5, 12.2_

- [ ] 9. Implement `app.js` — event handlers
  - [ ] 9.1 Implement `handleNavClick(e)` and attach to `#navigator`
    - Category click: toggle `.nav__category--open` on the category element
    - Subcategory click: call `activateDeck(deckIndex)` using `data-deck-index`
    - _Requirements: 2.2, 2.3_

  - [ ] 9.2 Implement `handleCardClick(e)` and `handleKeyDown(e)`
    - Card click/tap calls `flipCard()`
    - `keydown`: Space/Enter → `flipCard()`; ArrowRight → `navigateCard(+1)`; ArrowLeft → `navigateCard(-1)`
    - _Requirements: 4.1, 4.2, 5.2, 5.3, 12.2_

  - [ ] 9.3 Implement `handleControlsClick(e)` attached to the controls bar and deck header
    - Delegate to: Known → `markCard("known")`; Still Learning → `markCard("learning")`; Shuffle toggle → `toggleShuffle()`; Review Weak Cards → `activateReviewMode()`; Restart → `activateDeck(state.activeDeckIndex)`; Reset Progress → `resetProgress()`; Prev → `navigateCard(-1)`; Next → `navigateCard(+1)`
    - _Requirements: 5.1, 6.3, 6.4, 7.4, 7.5, 8.1, 9.1_

  - [ ] 9.4 Implement `handleSpeakerClick(e)` and SpeechSynthesis availability check
    - On `initApp`, check `'speechSynthesis' in window`; if false, add `no-speech` class to `<body>`
    - Speaker click: create `SpeechSynthesisUtterance` with `text = card.front` and `lang = "es-ES"`, call `speechSynthesis.speak(utterance)`
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 9.5 Write property test for SpeechSynthesis invocation (Property 11)
    - **Property 11: SpeechSynthesis called with correct text and language** — utterance `text` equals `card.front`, `lang` equals `"es-ES"`
    - **Validates: Requirements 10.2**

- [ ] 10. Checkpoint — full integration smoke check
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Create `test-properties.html` with fast-check property tests
  - Load fast-check via CDN (`https://cdn.jsdelivr.net/npm/fast-check/+esm` or unpkg UMD build)
  - Expose pure functions (`generateCardId`, `shuffleDeck`, `getWeakCards`) on `window` or inline them for test access
  - Implement all 12 property tests from the design's Testing Strategy section, each tagged `// Feature: spanish-flashcard-app, Property N: <text>`
  - Each property runs minimum 100 iterations via `fc.assert(fc.property(...), { numRuns: 100 })`
  - Display pass/fail results in the page DOM (no console-only output)
  - _Requirements: (validates all properties 1–12 from design)_

  - [ ]* 11.1 Property 1 — progress round-trip
  - [ ]* 11.2 Property 2 — shuffle preserves deck contents
  - [ ]* 11.3 Property 3 — shuffle/unshuffle restores original order
  - [ ]* 11.4 Property 4 — shuffle order stable during navigation
  - [ ]* 11.5 Property 5 — review mode filters correctly
  - [ ]* 11.6 Property 6 — mark card overwrites previous status
  - [ ]* 11.7 Property 7 — card ID stability
  - [ ]* 11.8 Property 8 — navigation resets flip state
  - [ ]* 11.9 Property 9 — Known/Still Learning buttons match flip state
  - [ ]* 11.10 Property 10 — card face display matches flip state
  - [ ]* 11.11 Property 11 — SpeechSynthesis called with correct text and language
  - [ ]* 11.12 Property 12 — review button disabled when no learning cards

- [ ] 12. Create `README.md`
  - Document how to run locally (VS Code Live Server and Python fallback)
  - Document how to deploy to GitHub Pages (Settings → Pages → main branch, root)
  - Document how to add a new deck or card to `cards.json` with a minimal example
  - _Requirements: 13.3_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Open `test-properties.html` via local server and verify all property tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property test sub-tasks in task 11 are all optional; the `test-properties.html` file itself (task 11) is required
- Each task references specific requirements for traceability
- Pure functions (`generateCardId`, `shuffleDeck`, `getWeakCards`, `deriveDisplayCards`) must be defined before rendering and event handler tasks
- `app.js` uses no ES modules — all functions share the same script scope
