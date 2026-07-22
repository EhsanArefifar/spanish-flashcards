# Requirements Document

## Introduction

A static, client-side flashcard application for learning Spanish vocabulary and phrases. All content is defined in `cards.json` and fetched at runtime. The app requires no build step, no backend, and no external dependencies. It is deployable to GitHub Pages by pushing to a repository.

## Glossary

- **App**: The Spanish flashcard single-page web application served from `index.html`
- **Deck**: A collection of flashcards sharing a `category` and `subcategory`, defined as one object in `cards.json`. A deck may be a flat card list or a hierarchical deck with sub-decks.
- **Sub-Deck**: A named group of cards within a hierarchical deck (e.g. "Group 1", "Group 2"). Sub-decks are defined inside a `subDecks` array on a parent deck and allow large decks to be split into smaller, manageable groups.
- **Card**: A single flashcard object with required `front` (Spanish) and `back` (English) fields, and optional `example` and `translation` fields
- **Card_ID**: A unique string identifier derived from a card's deck and position, used as the key in localStorage progress storage. For flat decks: `deck-{deckIndex}-card-{cardIndex}`. For sub-decks: `deck-{deckIndex}-sub-{subDeckIndex}-card-{cardIndex}`.
- **Navigator**: The sidebar or top navigation component that lists categories, subcategories, and (for hierarchical decks) collapsible sub-deck groups
- **Viewport**: The central area of the UI where the active card is displayed
- **Progress**: The per-card study status, either `"known"` or `"learning"`, persisted in localStorage
- **Shuffle_Mode**: An active state in which the App presents cards in a randomized order using Fisher-Yates
- **Review_Mode**: An active state in which the App filters the active deck to only cards marked `"learning"`
- **SpeechSynthesis**: The browser's built-in Web Speech API used for audio pronunciation
- **localStorage**: The browser's client-side key-value storage used to persist Progress between sessions

---

## Requirements

### Requirement 1: Data Loading

**User Story:** As a learner, I want the app to load all decks and cards automatically when I open the site, so that I can start studying without any manual setup.

#### Acceptance Criteria

1. WHEN the App initializes, THE App SHALL fetch `cards.json` using the `fetch()` API before rendering any deck content
2. WHEN `cards.json` is fetched successfully, THE App SHALL parse the JSON and store all decks in the application state
3. IF the `fetch()` call fails or returns a non-OK HTTP status, THEN THE App SHALL display a human-readable error message in the UI describing the failure
4. THE App SHALL build the Navigator dynamically from the parsed deck data
5. THE App SHALL NOT hardcode any card or deck content in `index.html` or `app.js`

---

### Requirement 2: Deck Navigation

**User Story:** As a learner, I want to browse and select any deck by category and subcategory, so that I can choose what to study.

#### Acceptance Criteria

1. THE Navigator SHALL list all unique categories present in the loaded deck data
2. WHEN a category is selected, THE Navigator SHALL expand to reveal all subcategories belonging to that category
3. WHEN a subcategory is clicked and the subcategory has sub-decks, THE Navigator SHALL expand or collapse the sub-deck list for that subcategory without activating any deck
4. WHEN a sub-deck entry (e.g. "Group 1") is clicked, THE App SHALL load the corresponding sub-deck and display its first Card in the Viewport
5. WHEN a subcategory without sub-decks is clicked, THE App SHALL load the corresponding Deck and display the first Card in the Viewport
6. WHILE a sub-deck is active, THE Navigator SHALL visually highlight the active sub-deck entry and keep its parent subcategory expanded
7. WHILE a flat deck is active, THE Navigator SHALL visually highlight the active subcategory entry
8. WHEN a new deck block is added to `cards.json`, THE Navigator SHALL include it automatically on next page load without any code changes

---

### Requirement 3: Flashcard Display

**User Story:** As a learner, I want to see the Spanish word prominently on the card front and the English translation on the back, so that I can test my recall effectively.

#### Acceptance Criteria

1. WHILE a Card is in its unflipped state, THE Viewport SHALL display the `front` field of the Card as the primary text
2. WHILE a Card is in its flipped state, THE Viewport SHALL display the `back` field of the Card as the primary text
3. WHILE a Card is in its flipped state and the Card has an `example` field, THE Viewport SHALL display the `example` value below the `back` text
4. WHILE a Card is in its flipped state and the Card has a `translation` field, THE Viewport SHALL display the `translation` value below the `example` text
5. THE Viewport SHALL display a progress indicator showing the current card position and total card count in the active Deck or Sub-Deck (e.g. "Card 4 of 10")
6. THE Viewport SHALL display the active Deck's subcategory name, and the active Sub-Deck's group name when a sub-deck is being studied

---

### Requirement 4: Card Flip Interaction

**User Story:** As a learner, I want to flip a card to reveal the answer, so that I can check whether I recalled it correctly.

#### Acceptance Criteria

1. WHEN the user clicks or taps the Card in the Viewport, THE App SHALL toggle the Card between its front and back states
2. WHEN the user presses the Space or Enter key, THE App SHALL toggle the Card between its front and back states
3. THE App SHALL animate the flip transition using CSS 3D transforms (`rotateY`, `perspective`, `backface-visibility`)
4. THE App SHALL complete the flip animation within a duration between 300ms and 500ms

---

### Requirement 5: Card Navigation

**User Story:** As a learner, I want to move between cards using buttons or keyboard shortcuts, so that I can study at my own pace.

#### Acceptance Criteria

1. THE Viewport SHALL provide a Next button and a Previous button for navigating between cards in the active Deck
2. WHEN the user presses the ArrowRight key, THE App SHALL advance to the next Card in the active Deck
3. WHEN the user presses the ArrowLeft key, THE App SHALL return to the previous Card in the active Deck
4. WHEN the user navigates to a different Card, THE App SHALL display that Card in its unflipped (front) state
5. WHEN the user advances past the last Card in the active Deck, THE App SHALL display a "Deck complete" message
6. WHILE the "Deck complete" message is shown, THE App SHALL provide a button to restart the Deck from the first Card
7. WHILE the "Deck complete" message is shown, THE App SHALL provide a button to enter Review_Mode for weak cards

---

### Requirement 6: Known / Still Learning Marking

**User Story:** As a learner, I want to mark each card as known or still learning after reviewing it, so that I can track which cards need more practice.

#### Acceptance Criteria

1. WHILE a Card is in its flipped state, THE Viewport SHALL display a "Known" button and a "Still Learning" button
2. WHILE a Card is in its unflipped state, THE Viewport SHALL NOT activate the "Known" and "Still Learning" buttons
3. WHEN the user clicks "Known", THE App SHALL set the Card's Progress status to `"known"` and save it to localStorage using the appropriate Card_ID (flat or hierarchical)
4. WHEN the user clicks "Still Learning", THE App SHALL set the Card's Progress status to `"learning"` and save it to localStorage using the appropriate Card_ID (flat or hierarchical)
5. THE Navigator SHALL display a green numeric badge showing the count of `"known"` cards and a red numeric badge showing the count of `"learning"` cards next to each subcategory entry and sub-deck entry; a badge SHALL only be shown when its count is greater than zero
6. WHEN the user marks a Card that already has a Progress status, THE App SHALL overwrite the previous status with the new value

---

### Requirement 7: Progress Persistence

**User Story:** As a learner, I want my card progress to be saved between sessions, so that I don't lose my study history when I close the browser.

#### Acceptance Criteria

1. THE App SHALL store all Card Progress statuses in localStorage using Card_ID as the key
2. WHEN the App initializes, THE App SHALL read all stored Progress from localStorage and apply it to the loaded card data before rendering
3. THE App SHALL store Progress for each Deck independently so that cards in different Decks do not share state
4. THE App SHALL provide a "Reset Progress" button that clears all stored Progress from localStorage
5. WHEN the user activates "Reset Progress", THE App SHALL remove all Progress entries from localStorage and re-render the current view with no statuses applied

---

### Requirement 8: Shuffle Mode

**User Story:** As a learner, I want to shuffle the card order, so that I can avoid memorizing cards by position.

#### Acceptance Criteria

1. WHILE a Deck is active, THE Viewport SHALL display a "Shuffle" toggle button
2. WHEN the user activates the Shuffle toggle, THE App SHALL reorder the active Deck's cards using the Fisher-Yates algorithm
3. WHILE Shuffle_Mode is active, THE App SHALL maintain the shuffled card order as the user navigates forward and backward
4. WHEN the user deactivates the Shuffle toggle, THE App SHALL restore the original card order as defined in `cards.json`

---

### Requirement 9: Review Weak Cards Mode

**User Story:** As a learner, I want to review only the cards I'm still learning, so that I can focus my practice on problem areas.

#### Acceptance Criteria

1. WHILE a Deck is active, THE Viewport SHALL display a "Review Weak Cards" button in the Deck header
2. WHILE the "Deck complete" message is shown, THE App SHALL display a "Review Weak Cards" button
3. WHEN the user activates "Review Weak Cards" and the active Deck contains at least one Card with Progress status `"learning"`, THE App SHALL enter Review_Mode and filter the Deck to only those Cards
4. WHILE Review_Mode is active, THE Viewport SHALL display a visually distinct "Review Mode" label
5. WHILE the active Deck contains no Cards with Progress status `"learning"`, THE App SHALL disable the "Review Weak Cards" button and display a tooltip explaining why it is disabled

---

### Requirement 10: Audio Pronunciation

**User Story:** As a learner, I want to hear the Spanish pronunciation of a word, so that I can learn correct spoken form alongside written form.

#### Acceptance Criteria

1. WHILE a Card is displayed, THE Viewport SHALL show a speaker icon button on the card front
2. WHEN the user clicks the speaker icon, THE App SHALL use the SpeechSynthesis API to speak the `front` field text with language set to `es-ES`
3. WHERE the browser does not support the SpeechSynthesis API, THE App SHALL hide the speaker icon button

---

### Requirement 11: cards.json Schema

**User Story:** As a content author, I want a strict and predictable JSON schema for `cards.json`, so that I can add new decks and cards without breaking the app.

#### Acceptance Criteria

1. THE App SHALL expect `cards.json` to contain a top-level `decks` array
2. THE App SHALL expect each element of `decks` to contain a `category` string and a `subcategory` string, plus either a `cards` array (flat deck) or a `subDecks` array (hierarchical deck)
3. WHEN a deck has a `subDecks` array, THE App SHALL expect each element of `subDecks` to contain a `groupName` string and a `cards` array
4. THE App SHALL expect each element of `cards` to contain a `front` string and a `back` string
5. THE App SHALL treat `example` and `translation` fields on each card as optional
6. WHEN a new deck object conforming to the schema is added to `cards.json`, THE App SHALL include it in the Navigator and make it available for study on next page load without any code changes

---

### Requirement 12: Mobile Usability

**User Story:** As a learner, I want the app to work well on my phone, so that I can study during my commute.

#### Acceptance Criteria

1. THE App SHALL render correctly at a viewport width of 375px
2. WHEN the user taps the Card on a touch device, THE App SHALL trigger the flip interaction
3. THE App SHALL render all interactive buttons with a minimum touch target size of 44×44 CSS pixels
4. THE App SHALL use a minimum base font size of 16px for body text
5. WHILE the viewport width is below 768px, THE Navigator SHALL collapse into a compact or hidden state accessible via a toggle

---

### Requirement 13: Navigator Card Count Display

**User Story:** As a learner, I want to see how many cards are in each deck and category at a glance, so that I can gauge the size of what I'm about to study.

#### Acceptance Criteria

1. THE Navigator SHALL display the total number of cards next to each subcategory entry; for hierarchical decks this is the sum of all its sub-deck card counts
2. THE Navigator SHALL display the total number of cards next to each sub-deck entry (e.g. "Group 1 · 10")
3. THE Navigator SHALL display the total number of cards across all its decks next to each category entry (e.g. "Verbs · 130")
4. WHEN a new deck is added to `cards.json`, THE Navigator SHALL reflect the updated card counts automatically on next page load without any code changes
5. THE card count totals SHALL be derived from the loaded deck data and SHALL NOT be hardcoded

---

### Requirement 14: GitHub Pages Deployment

**User Story:** As a content author, I want to deploy the app to GitHub Pages with no build step, so that I can publish updates by simply pushing to GitHub.

#### Acceptance Criteria

1. THE App SHALL be served entirely from `index.html` located at the repository root
2. THE App SHALL require no build command, compilation step, or server-side processing to function
3. THE App SHALL include a `README.md` that documents how to deploy to GitHub Pages, how to run locally, and how to add new cards
