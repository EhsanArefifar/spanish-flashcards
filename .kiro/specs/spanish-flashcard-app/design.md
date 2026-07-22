# Design Document: Spanish Flashcard App

## Overview

A static, client-side single-page application (SPA) for studying Spanish vocabulary. All content lives in `cards.json` and is fetched at runtime. There is no backend, no build step, and no external dependencies. The app runs entirely in the browser using vanilla HTML5, CSS, and JavaScript (ES2020+).

The design follows a single-file-per-concern structure: `index.html` for markup, `style.css` for all styles, `app.js` for all logic, and `cards.json` as the content source. State is held in a single `state` object in memory and persisted to `localStorage` where needed.

### Key Design Decisions

- **Single state object** — all mutable app state lives in one place, making rendering predictable and debuggable.
- **Event delegation** — all interaction events are attached to stable parent containers, not individual cards or buttons that get re-rendered.
- **Pure functions for data** — functions that transform data (shuffle, filter, derive card IDs) are kept separate from DOM manipulation functions.
- **No ES modules** — `app.js` is a single script loaded with `<script defer>`. All functions and the state object are in the same scope.

---

## Architecture

The app follows a simple render-on-state-change pattern. User interactions mutate the `state` object, then call a render function that updates the DOM to reflect the new state.

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────┐   fetch()   ┌────────────┐                │
│  │  app.js  │ ──────────► │ cards.json │                │
│  │          │ ◄────────── │            │                │
│  │  state   │             └────────────┘                │
│  │  object  │                                           │
│  │          │  read/write  ┌─────────────┐              │
│  │          │ ◄──────────► │ localStorage│              │
│  │          │              └─────────────┘              │
│  │          │  render()    ┌─────────────┐              │
│  │          │ ──────────► │   DOM        │              │
│  │          │              │ (index.html) │              │
│  │          │  events      │             │              │
│  │          │ ◄─────────── │             │              │
│  └──────────┘              └─────────────┘              │
└─────────────────────────────────────────────────────────┘
```

### Initialization Sequence

```
page load
  └─ app.js deferred script executes
       └─ fetch('cards.json')
            ├─ success → parse JSON → state.decks = data.decks
            │              └─ loadProgressFromStorage()
            │                   └─ renderNavigator()
            │                        └─ activateFirstDeck()
            │                             └─ renderCard()
            └─ failure → renderError(message)
```

---

## Components and Interfaces

The UI is divided into three regions defined in `index.html`:

### 1. Navigator (`#navigator`)

Lists all categories, subcategories, and hierarchical sub-deck groups. Built dynamically from `state.decks`. Categories and subcategories are collapsible. The active subcategory or sub-deck is highlighted.

Responsibilities:
- Render category/subcategory/sub-deck tree from deck data
- Handle category expand/collapse via event delegation
- Handle subcategory expand/collapse for hierarchical decks (those with `subDecks` array)
- Handle sub-deck click → `activateSubDeck(deckIndex, subDeckIndex)`
- Handle regular subcategory click → `activateDeck(deckIndex)`
- Show per-deck and per-sub-deck progress badges: a green `.badge--known` with the count of `"known"` cards and a red `.badge--learning` with the count of `"learning"` cards; each badge is only rendered when its count is greater than zero
- Show total card count next to each subcategory label (e.g. "P-A1-1 · 30"), each sub-deck label (e.g. "Group 1 · 10"), and the summed total next to each category label (e.g. "Verbs · 130")
- Collapse into a toggle-accessible panel on mobile (viewport < 768px)

### 2. Viewport (`#viewport`)

The central study area. Shows the active card, progress indicator, and all study controls.

Sub-regions:
- **Deck header**: subcategory name, "Review Weak Cards" button, "Shuffle" toggle
- **Card**: the flippable card element with front/back faces
- **Controls bar**: Previous, Next, Known, Still Learning buttons; speaker icon
- **Progress indicator**: "Card N of M" text
- **Deck complete screen**: shown when past the last card; Restart and Review Weak Cards buttons

### 3. Error region (`#error-message`)

Hidden by default. Shown when `cards.json` fails to load. Displays a human-readable message.

### JavaScript Function Groups

```
Initialization
  initApp()              — entry point, calls fetch then bootstraps state
  loadProgressFromStorage() — reads localStorage into state.progress

Data / Pure Functions
  generateCardId(deckIndex, cardIndex)
                         — returns stable string key for flat-deck cards
  generateSubDeckCardId(deckIndex, subDeckIndex, cardIndex)
                         — returns stable string key for hierarchical sub-deck cards
  shuffleDeck(cards)     — Fisher-Yates, returns new shuffled array
  getWeakCards(deck, progress) — returns cards filtered to "learning" status
  deriveDisplayCards()   — returns the current ordered/filtered card array

Rendering
  renderNavigator()      — builds the nav tree from state.decks; handles both flat
                           and hierarchical decks; shows known/learning badges and
                           card counts per subcategory, sub-deck, and category
  renderCard()           — renders the active card face(s) into the viewport
  renderProgressIndicator() — updates "Card N of M" text
  renderDeckComplete()   — shows the end-of-deck screen
  renderError(msg)       — shows the error region

Event Handlers (attached once via delegation)
  handleNavClick(e)      — category expand/collapse; subcategory expand/collapse
                           for hierarchical decks; sub-deck activation;
                           regular subcategory activation
  handleCardClick(e)     — flip toggle
  handleKeyDown(e)       — Space/Enter (flip), ArrowLeft/Right (navigate)
  handleControlsClick(e) — Known, Still Learning, Shuffle, Review, Restart, Reset Progress
  handleSpeakerClick(e)  — SpeechSynthesis

State Mutations
  activateDeck(deckIndex)         — activates a flat deck
  activateSubDeck(deckIndex, subDeckIndex)
                                  — activates a sub-deck within a hierarchical deck
  activateFirstDeck()             — activates the first available deck or sub-deck on load
  navigateCard(direction)         — +1 or -1
  flipCard()
  markCard(status)                — "known" | "learning"
  toggleShuffle()
  activateReviewMode()
  resetProgress()
```

---

## Data Models

### Runtime State Object

```js
const state = {
  decks: [],             // Array<Deck> — parsed from cards.json, never mutated
  activeDeck: null,      // Deck | null — reference into state.decks
  activeDeckIndex: 0,    // number — index into state.decks
  activeSubDeckIndex: -1,// number — index into activeDeck.subDecks; -1 means flat deck
  displayCards: [],      // Array<Card> — current ordered/filtered view (shuffled or review subset)
  currentIndex: 0,       // number — index into displayCards
  isFlipped: false,      // boolean
  isShuffled: false,     // boolean
  isReviewMode: false,   // boolean
  progress: {}           // Record<CardId, "known" | "learning">
};
```

### cards.json Schema (runtime types)

```js
// Flat Deck (Vocabulary, etc.)
{
  category: string,      // e.g. "Vocabulary"
  subcategory: string,   // e.g. "Coloquial-1" — unique per deck
  cards: Card[]
}

// Hierarchical Deck (Verbs)
{
  category: string,      // e.g. "Verbs"
  subcategory: string,   // e.g. "P-A1-1"
  subDecks: SubDeck[]    // groups of cards within this deck
}

// SubDeck
{
  groupName: string,     // e.g. "Group 1"
  cards: Card[]          // 10 cards per group
}

// Card
{
  front: string,         // Spanish word/phrase (required)
  back: string,          // English translation (required)
  example?: string,      // Spanish example sentence (optional)
  translation?: string   // English translation of example (optional)
}
```

### Card ID Derivation

Card IDs are used as localStorage keys. They are derived deterministically from deck and card position in the original (unshuffled) `state.decks` array so they remain stable across sessions.

**Flat deck** (Vocabulary, etc.):
```js
function generateCardId(deckIndex, cardIndex) {
  return `deck-${deckIndex}-card-${cardIndex}`;
}
```

**Hierarchical sub-deck** (Verbs with groups):
```js
function generateSubDeckCardId(deckIndex, subDeckIndex, cardIndex) {
  return `deck-${deckIndex}-sub-${subDeckIndex}-card-${cardIndex}`;
}
```

The correct generator is selected at runtime based on `state.activeSubDeckIndex`: when it is `-1` the deck is flat; otherwise the sub-deck generator is used.

### localStorage Schema

```
Key:   "flashcard-progress"
Value: JSON string of Record<CardId, "known" | "learning">

Example (mix of flat and sub-deck IDs):
{
  "deck-0-sub-0-card-0": "known",
  "deck-0-sub-0-card-3": "learning",
  "deck-3-card-1": "known"
}
```

All progress is stored under a single key as a serialized JSON object. On load, the entire object is parsed and stored in `state.progress`. On any mark action, the object is re-serialized and written back.

### CSS Class Model (BEM-like)

```
.card                  — the card container (3D perspective wrapper)
.card__inner           — the rotating element
.card__front           — front face
.card__back            — back face
.card--flipped         — applied to .card when isFlipped is true

.nav                   — navigator root
.nav__category         — category row
.nav__category--open   — expanded state
.nav__subcategory      — subcategory row
.nav__subcategory--expandable — subcategory that contains sub-decks (has expand/collapse behaviour)
.nav__subcategory--open       — expandable subcategory in its expanded state
.nav__subcategory--active     — currently selected flat deck
.nav__subdeck-list     — hidden list of sub-deck groups, shown when parent is --open
.nav__subdeck          — individual sub-deck row (Group 1, Group 2, …)
.nav__subdeck--active  — currently selected sub-deck
.nav__label            — wrapper that stacks name above card count
.nav__count            — total card count shown beneath each nav label

.btn                   — base button style
.btn--known            — green variant
.btn--learning         — red variant
.btn--disabled         — visually disabled state

.badge                 — small status indicator on nav items
.badge--known
.badge--learning
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Progress round-trip

*For any* set of card progress statuses, serializing them to localStorage and then reading them back should produce an identical progress map — same Card_IDs, same status values, no entries added or lost.

**Validates: Requirements 7.1, 7.2**

### Property 2: Shuffle preserves deck contents

*For any* deck, shuffling its cards using Fisher-Yates should produce an array containing exactly the same card objects as the original, with no additions, removals, or duplications.

**Validates: Requirements 8.2**

### Property 3: Shuffle then unshuffle restores original order

*For any* deck, activating shuffle and then deactivating shuffle should restore `displayCards` to the same order as the original `cards` array in `state.decks`.

**Validates: Requirements 8.4**

### Property 4: Shuffle order is stable during navigation

*For any* shuffled deck, navigating forward and backward through cards should not alter the shuffled `displayCards` array — the order established at shuffle time must persist for the entire navigation session.

**Validates: Requirements 8.3**

### Property 5: Review mode filters correctly

*For any* deck and any progress map, entering Review Mode should produce a `displayCards` list that contains only cards whose Card_ID maps to `"learning"` in the progress map — no `"known"` cards and no unmarked cards should appear.

**Validates: Requirements 9.3**

### Property 6: Mark card overwrites previous status

*For any* card that already has a progress status, marking it with a new status should result in the progress map containing only the new status for that card's ID — the previous value must not persist in either `state.progress` or localStorage.

**Validates: Requirements 6.3, 6.4, 6.6**

### Property 7: Card ID stability

*For any* deck index and card index, `generateCardId` should always return the same string for the same inputs, regardless of how many times it is called or what other state mutations have occurred between calls.

**Validates: Requirements 7.1, 7.3**

### Property 8: Navigation resets flip state

*For any* navigation action (next or previous), the resulting `state.isFlipped` should be `false`, regardless of the flip state before navigation occurred.

**Validates: Requirements 5.4**

### Property 9: Known/Still Learning buttons match flip state

*For any* card state, the Known and Still Learning buttons should be enabled if and only if `state.isFlipped` is `true` — they must be disabled when the card is showing its front face.

**Validates: Requirements 6.1, 6.2**

### Property 10: Card face display matches flip state

*For any* card and any flip state, the viewport should display the `front` field text when `isFlipped` is `false`, and the `back` field text when `isFlipped` is `true` — and optional `example` and `translation` fields should appear only when `isFlipped` is `true` and those fields are present on the card.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 11: SpeechSynthesis called with correct text and language

*For any* card `front` text string, clicking the speaker button should invoke `speechSynthesis.speak` with an utterance whose `text` equals the card's `front` value and whose `lang` is set to `"es-ES"`.

**Validates: Requirements 10.2**

### Property 12: Review button disabled when no learning cards exist

*For any* active deck where no card has a progress status of `"learning"`, the Review Weak Cards button should have the `disabled` attribute set and should not be activatable.

**Validates: Requirements 9.5**

### Property 13: Navigator card counts match deck data

*For any* loaded set of decks, the total card count displayed next to each subcategory in the Navigator should equal the total cards in that deck (sum of all sub-deck card counts for hierarchical decks, or the flat `cards.length`), the count displayed next to each sub-deck group should equal that sub-deck's `cards.length`, and the count displayed next to each category should equal the sum of all its deck sizes — all derived from `state.decks` at render time.

**Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

---

## Error Handling

### fetch() failure (Requirement 1.3)

If `fetch('cards.json')` rejects (network error) or returns a non-OK HTTP status, the app:
1. Catches the error in a `.catch()` handler
2. Hides the navigator and viewport
3. Shows `#error-message` with a human-readable string, e.g. "Could not load cards.json (404). Make sure the file exists at the repository root."

No retry logic — the user must reload the page.

### SpeechSynthesis unavailable (Requirement 10.3)

On initialization, check `'speechSynthesis' in window`. If false, the speaker button is hidden via a CSS class added to the body (e.g. `body.no-speech`). No error is shown to the user.

### Malformed cards.json

If the JSON parses successfully but the `decks` array is missing or empty, the app shows a message: "No decks found in cards.json." Individual cards missing required `front` or `back` fields are skipped silently during rendering to avoid crashing the whole deck.

### Review Mode with no weak cards (Requirement 9.5)

The "Review Weak Cards" button is disabled (via `disabled` attribute and `.btn--disabled` class) when no cards in the active deck have `"learning"` status. A `title` attribute provides the tooltip: "No cards marked as Still Learning in this deck."

### localStorage unavailable

`localStorage` access is wrapped in a `try/catch`. If unavailable (e.g. private browsing with storage blocked), progress marking silently no-ops and the app continues to function without persistence.

---

## Testing Strategy

This app is vanilla JS with no build step, so testing uses browser-native patterns and a lightweight property-based testing library loaded via CDN in a separate test HTML file.

### Unit Tests

Use a minimal test harness (e.g. a `test.html` file with inline assertions) to cover:

- `generateCardId(deckIndex, cardIndex)` — specific examples and edge cases (index 0, large indices)
- `shuffleDeck(cards)` — verify output length equals input length with a concrete example
- `getWeakCards(deck, progress)` — example: deck with 3 cards, 1 marked learning → returns 1 card
- `deriveDisplayCards()` — example: shuffle off, review off → returns full deck in order
- Progress serialization/deserialization — write then read produces same object
- Error rendering — fetch failure shows error element, hides viewport

### Property-Based Tests

Use [fast-check](https://github.com/dubzzz/fast-check) loaded via CDN in `test-properties.html`. Each property test runs a minimum of 100 iterations.

Property tests map directly to the Correctness Properties section above:

- **Property 1** (progress round-trip): Generate arbitrary `Record<string, "known"|"learning">`, serialize to JSON, parse back, assert deep equality.
- **Property 2** (shuffle preserves contents): Generate arbitrary card arrays, shuffle, assert same elements via sorted comparison.
- **Property 3** (shuffle/unshuffle round-trip): Generate arbitrary card arrays, shuffle then restore original reference, assert original order.
- **Property 4** (shuffle order stable during navigation): Generate shuffled deck, record `displayCards`, simulate forward/back navigation, assert `displayCards` unchanged.
- **Property 5** (review mode filter): Generate arbitrary deck + progress map with at least one `"learning"` card, call `getWeakCards`, assert every returned card has `"learning"` status.
- **Property 6** (mark overwrites): Generate arbitrary card ID and two statuses, apply first then second, assert only second remains in both `state.progress` and localStorage.
- **Property 7** (card ID stability): Generate arbitrary deck/card index pairs, call `generateCardId` twice, assert identical output.
- **Property 8** (navigation resets flip): Generate arbitrary state with `isFlipped: true`, call `navigateCard(+1)` or `navigateCard(-1)`, assert `state.isFlipped === false`.
- **Property 9** (buttons match flip state): Generate arbitrary card state, assert Known/Still Learning buttons disabled attribute equals `!isFlipped`.
- **Property 10** (card face display): Generate arbitrary cards with varying optional fields, render at both flip states, assert correct text visible and optional fields conditional on flip state and field presence.
- **Property 11** (SpeechSynthesis text and language): Generate arbitrary front text strings, mock `speechSynthesis.speak`, click speaker, assert utterance `text` and `lang` match.
- **Property 12** (review button disabled): Generate decks where no card has `"learning"` status, render, assert review button has `disabled` attribute.
- **Property 13** (navigator card counts): Generate arbitrary deck arrays with varying sizes, call `renderNavigator`, assert each subcategory count label equals its deck's `cards.length` and each category count equals the sum of its subcategory deck sizes.

Tag format for each test: `// Feature: spanish-flashcard-app, Property N: <property text>`

### Integration / Smoke Tests

Manual browser checks (no automation required given the zero-dependency constraint):

- Load `index.html` via Live Server → navigator renders, first deck activates
- Click a category → it expands to show all subcategories
- Click a subcategory with sub-decks (e.g. P-A1-1) → it expands/collapses to show/hide Group 1, Group 2, Group 3 without activating any deck
- Click a sub-deck group (e.g. Group 1) → that group loads, "Card 1 of 10" shown, parent subcategory stays expanded and highlighted
- Click a flat subcategory (e.g. Coloquial-1) → correct deck loads, card 1 of N shown
- Flip card → back face visible, Known/Still Learning buttons active
- Mark known → reload page → card still shows known status, badge appears on sub-deck in navigator
- Shuffle → navigate forward/back → all cards present, no duplicates
- Review Mode with no weak cards → button disabled with tooltip
- Resize to 375px → navigator collapses, all buttons remain tappable
- Disable JS SpeechSynthesis in devtools → speaker icon hidden
