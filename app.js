/**
 * app.js — Spanish Flashcard App
 *
 * Single-file vanilla JavaScript application (ES2020+, no modules).
 * All functions share the same script scope.
 *
 * Sections (added incrementally across tasks):
 *   1. State object
 *   2. Pure data functions: generateCardId, shuffleDeck, getWeakCards, deriveDisplayCards
 *   3. Initialization & progress persistence
 *   4. Rendering functions: renderNavigator, renderCard, renderProgressIndicator, renderDeckComplete, renderError
 *   5. State mutations: activateDeck, activateFirstDeck, flipCard, navigateCard, markCard, resetProgress, toggleShuffle, activateReviewMode
 *   6. Event handlers: handleNavClick, handleCardClick, handleKeyDown, handleControlsClick, handleSpeakerClick, attachEventListeners
 */

// ---------------------------------------------------------------------------
// 1. State
// ---------------------------------------------------------------------------

const state = {
  decks: [],           // Array<Deck> — parsed from cards.json, never mutated
  activeDeck: null,    // Deck | null — reference into state.decks
  activeDeckIndex: 0,  // number — index into state.decks
  activeSubDeckIndex: -1, // number — index into activeDeck.subDecks (-1 = not a sub-deck)
  displayCards: [],    // Array<Card> — current ordered/filtered view
  currentIndex: 0,     // number — index into displayCards
  isFlipped: false,    // boolean
  isShuffled: false,   // boolean
  isReviewMode: false, // boolean
  progress: {}         // Record<CardId, "known" | "learning">
};

// ---------------------------------------------------------------------------
// 2. Pure data functions
// ---------------------------------------------------------------------------

/**
 * Derives a stable, unique string key for a card based on its position in the
 * original (unshuffled) decks array. Used as the localStorage progress key.
 *
 * @param {number} deckIndex  - Index of the deck in state.decks
 * @param {number} cardIndex  - Index of the card within that deck's cards array
 * @returns {string}
 */
function generateCardId(deckIndex, cardIndex) {
  return `deck-${deckIndex}-card-${cardIndex}`;
}

/**
 * Generates a stable, unique string key for a card in a sub-deck (hierarchical structure).
 * Used for the new hierarchical VERBS sections.
 *
 * @param {number} deckIndex     - Index of the main deck in state.decks
 * @param {number} subDeckIndex  - Index of the sub-deck within the main deck's subDecks array
 * @param {number} cardIndex     - Index of the card within that sub-deck's cards array
 * @returns {string}
 */
function generateSubDeckCardId(deckIndex, subDeckIndex, cardIndex) {
  return `deck-${deckIndex}-sub-${subDeckIndex}-card-${cardIndex}`;
}

/**
 * Returns a new array containing the same cards in a randomised order using
 * the Fisher-Yates (Knuth) shuffle algorithm. The original array is not mutated.
 *
 * @param {Array} cards - The source card array to shuffle
 * @returns {Array}     - A new shuffled array
 */
function shuffleDeck(cards) {
  const shuffled = [...cards]; // copy — never mutate the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at i and j
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Filters a deck's cards to only those whose Card_ID maps to "learning" in the
 * given progress map. Card IDs are derived using state.activeDeckIndex and each
 * card's index within the deck's cards array.
 *
 * @param {Object} deck       - A deck object with a `cards` array
 * @param {Object} progress   - Record<CardId, "known" | "learning">
 * @returns {Array}           - Filtered array of cards with "learning" status
 */
function getWeakCards(deck, progress) {
  if (!deck || !deck.cards) return [];
  return deck.cards.filter((card, cardIndex) => {
    let cardId;
    // activeSubDeckIndex === -1 means regular (non-hierarchical) deck
    if (state.activeSubDeckIndex !== -1) {
      // Hierarchical deck - use sub-deck ID
      cardId = generateSubDeckCardId(state.activeDeckIndex, state.activeSubDeckIndex, cardIndex);
    } else {
      // Regular deck
      cardId = generateCardId(state.activeDeckIndex, cardIndex);
    }
    return progress[cardId] === 'learning';
  });
}

/**
 * Derives the current display card list from state, applying shuffle and/or
 * review-mode filters as appropriate.
 *
 * Priority:
 *   - isReviewMode true  → filtered list of "learning" cards only
 *   - isShuffled true    → shuffled copy of the active deck's cards
 *   - otherwise          → full deck in original order
 *
 * Updates state.displayCards in place and returns the new array.
 *
 * @returns {Array} - The derived display card array
 */
function deriveDisplayCards() {
  if (!state.activeDeck || !state.activeDeck.cards) {
    state.displayCards = [];
    return state.displayCards;
  }

  if (state.isReviewMode) {
    state.displayCards = getWeakCards(state.activeDeck, state.progress);
  } else if (state.isShuffled) {
    state.displayCards = shuffleDeck(state.activeDeck.cards);
  } else {
    state.displayCards = [...state.activeDeck.cards];
  }

  return state.displayCards;
}

// ---------------------------------------------------------------------------
// 3. Initialization & progress persistence
// ---------------------------------------------------------------------------

/**
 * Reads the stored progress object from localStorage and merges it into
 * state.progress. Wrapped in try/catch so private-browsing restrictions
 * don't crash the app.
 */
function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem('flashcard-progress');
    if (raw) {
      state.progress = JSON.parse(raw);
    }
  } catch (e) {
    // localStorage unavailable or JSON malformed — silently continue
    state.progress = {};
  }
}

/**
 * Entry point. Fetches cards.json, bootstraps state, and renders the UI.
 * Called once when the deferred script executes.
 */
function initApp() {
  // Check SpeechSynthesis availability (Req 10.3)
  if (!('speechSynthesis' in window)) {
    document.body.classList.add('no-speech');
  }

  // Attach event listeners immediately — before fetch completes — so the
  // mobile nav toggle (and all other controls) work even if fetch is slow
  // or fails.
  attachEventListeners();

  fetch('cards.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Could not load cards.json (${response.status}). Make sure the file exists at the repository root.`);
      }
      return response.json();
    })
    .then(data => {
      if (!data.decks || data.decks.length === 0) {
        renderError('No decks found in cards.json.');
        return;
      }
      state.decks = data.decks;
      loadProgressFromStorage();
      renderNavigator();
      activateFirstDeck();
    })
    .catch(err => {
      renderError(err.message || 'Failed to load cards.json. Please check the file and try again.');
    });
}

// ---------------------------------------------------------------------------
// 4. Rendering functions
// ---------------------------------------------------------------------------

/**
 * Builds the category/subcategory navigation tree from state.decks.
 * Now supports hierarchical sub-decks for collapsible groups.
 * Attaches data-deck-index and data-subdeck-index to clickable items.
 * Shows known/learning badge counts per group.
 * Marks the active subcategory with .nav__subcategory--active.
 * Requirements: 2.1, 2.4, 2.5, 6.5
 */
function renderNavigator() {
  const nav = document.getElementById('navigator');
  if (!nav) return;

  // Group decks by category
  const categories = {};
  state.decks.forEach((deck, deckIndex) => {
    if (!categories[deck.category]) {
      categories[deck.category] = [];
    }
    categories[deck.category].push({ deck, deckIndex });
  });

  nav.innerHTML = '';

  Object.entries(categories).forEach(([categoryName, entries]) => {
    // Compute total card count for this category
    const categoryCardCount = entries.reduce((sum, { deck }) => {
      if (deck.subDecks) {
        return sum + deck.subDecks.reduce((subSum, subDeck) => subSum + subDeck.cards.length, 0);
      }
      return sum + (deck.cards ? deck.cards.length : 0);
    }, 0);

    // Category row
    const categoryEl = document.createElement('div');
    categoryEl.className = 'nav__category';
    categoryEl.setAttribute('role', 'button');
    categoryEl.setAttribute('tabindex', '0');
    categoryEl.setAttribute('aria-expanded', 'false');

    const categoryLabelDiv = document.createElement('div');
    categoryLabelDiv.className = 'nav__label';

    const categoryNameSpan = document.createElement('span');
    categoryNameSpan.textContent = categoryName;

    const categoryCountSpan = document.createElement('span');
    categoryCountSpan.className = 'nav__count';
    categoryCountSpan.textContent = `${categoryCardCount} cards`;

    categoryLabelDiv.appendChild(categoryNameSpan);
    categoryLabelDiv.appendChild(categoryCountSpan);
    categoryEl.appendChild(categoryLabelDiv);

    // Subcategory list
    const subcategoryList = document.createElement('ul');
    subcategoryList.className = 'nav__subcategory-list';

    entries.forEach(({ deck, deckIndex }) => {
      if (deck.subDecks) {
        // This deck has sub-decks (hierarchical structure)
        const mainLi = document.createElement('li');
        mainLi.className = 'nav__subcategory nav__subcategory--expandable';
        mainLi.setAttribute('role', 'button');
        mainLi.setAttribute('tabindex', '0');
        mainLi.setAttribute('aria-expanded', 'false');

        // Calculate total cards in all sub-decks
        const totalCards = deck.subDecks.reduce((sum, subDeck) => sum + subDeck.cards.length, 0);

        const mainLabelDiv = document.createElement('div');
        mainLabelDiv.className = 'nav__label';

        const mainNameSpan = document.createElement('span');
        mainNameSpan.textContent = deck.subcategory;

        const mainCountSpan = document.createElement('span');
        mainCountSpan.className = 'nav__count';
        mainCountSpan.textContent = `${totalCards} cards`;

        mainLabelDiv.appendChild(mainNameSpan);
        mainLabelDiv.appendChild(mainCountSpan);
        mainLi.appendChild(mainLabelDiv);

        // Sub-deck list (groups)
        const subDeckList = document.createElement('ul');
        subDeckList.className = 'nav__subdeck-list';

        deck.subDecks.forEach((subDeck, subDeckIndex) => {
          const subLi = document.createElement('li');
          subLi.className = 'nav__subdeck';
          subLi.dataset.deckIndex = deckIndex;
          subLi.dataset.subDeckIndex = subDeckIndex;
          subLi.setAttribute('role', 'button');
          subLi.setAttribute('tabindex', '0');

          // Count known/learning for this sub-deck
          let knownCount = 0;
          let learningCount = 0;
          subDeck.cards.forEach((card, cardIndex) => {
            const cardId = generateSubDeckCardId(deckIndex, subDeckIndex, cardIndex);
            if (state.progress[cardId] === 'known') knownCount++;
            else if (state.progress[cardId] === 'learning') learningCount++;
          });

          const subLabelDiv = document.createElement('div');
          subLabelDiv.className = 'nav__label';

          const subNameSpan = document.createElement('span');
          subNameSpan.textContent = subDeck.groupName;

          const subCountSpan = document.createElement('span');
          subCountSpan.className = 'nav__count';
          subCountSpan.textContent = `${subDeck.cards.length} cards`;

          subLabelDiv.appendChild(subNameSpan);
          subLabelDiv.appendChild(subCountSpan);

          const badgesDiv = document.createElement('div');
          badgesDiv.className = 'nav__badges';

          if (knownCount > 0) {
            const knownBadge = document.createElement('span');
            knownBadge.className = 'badge badge--known';
            knownBadge.textContent = knownCount;
            knownBadge.setAttribute('title', `${knownCount} known`);
            badgesDiv.appendChild(knownBadge);
          }
          if (learningCount > 0) {
            const learningBadge = document.createElement('span');
            learningBadge.className = 'badge badge--learning';
            learningBadge.textContent = learningCount;
            learningBadge.setAttribute('title', `${learningCount} still learning`);
            badgesDiv.appendChild(learningBadge);
          }

          subLi.appendChild(subLabelDiv);
          subLi.appendChild(badgesDiv);

          // Active state
          if (deckIndex === state.activeDeckIndex && subDeckIndex === state.activeSubDeckIndex && state.activeDeck) {
            subLi.classList.add('nav__subdeck--active');
            mainLi.classList.add('nav__subcategory--open');
            mainLi.setAttribute('aria-expanded', 'true');
            categoryEl.classList.add('nav__category--open');
            categoryEl.setAttribute('aria-expanded', 'true');
          }

          subDeckList.appendChild(subLi);
        });

        mainLi.appendChild(subDeckList);
        subcategoryList.appendChild(mainLi);

      } else {
        // Regular deck (no sub-decks)
        const li = document.createElement('li');
        li.className = 'nav__subcategory';
        li.dataset.deckIndex = deckIndex;
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');

        // Count known/learning for this deck
        let knownCount = 0;
        let learningCount = 0;
        deck.cards.forEach((card, cardIndex) => {
          const cardId = generateCardId(deckIndex, cardIndex);
          if (state.progress[cardId] === 'known') knownCount++;
          else if (state.progress[cardId] === 'learning') learningCount++;
        });

        const nameLabelDiv = document.createElement('div');
        nameLabelDiv.className = 'nav__label';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = deck.subcategory;

        const subcategoryCountSpan = document.createElement('span');
        subcategoryCountSpan.className = 'nav__count';
        subcategoryCountSpan.textContent = `${deck.cards.length} cards`;

        nameLabelDiv.appendChild(nameSpan);
        nameLabelDiv.appendChild(subcategoryCountSpan);

        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'nav__badges';

        if (knownCount > 0) {
          const knownBadge = document.createElement('span');
          knownBadge.className = 'badge badge--known';
          knownBadge.textContent = knownCount;
          knownBadge.setAttribute('title', `${knownCount} known`);
          badgesDiv.appendChild(knownBadge);
        }
        if (learningCount > 0) {
          const learningBadge = document.createElement('span');
          learningBadge.className = 'badge badge--learning';
          learningBadge.textContent = learningCount;
          learningBadge.setAttribute('title', `${learningCount} still learning`);
          badgesDiv.appendChild(learningBadge);
        }

        li.appendChild(nameLabelDiv);
        li.appendChild(badgesDiv);

        // Active state
        if (deckIndex === state.activeDeckIndex && state.activeDeck && !state.activeDeck.subDecks) {
          li.classList.add('nav__subcategory--active');
          categoryEl.classList.add('nav__category--open');
          categoryEl.setAttribute('aria-expanded', 'true');
        }

        subcategoryList.appendChild(li);
      }
    });

    nav.appendChild(categoryEl);
    nav.appendChild(subcategoryList);
  });
}

/**
 * Renders the active card into the viewport.
 * Populates front text, back text, optional example/translation.
 * Toggles .card--flipped based on state.isFlipped.
 * Enables/disables Known and Still Learning buttons based on flip state.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2
 */
function renderCard() {
  const card = state.displayCards[state.currentIndex];
  if (!card) return;

  const cardEl = document.getElementById('card');
  const frontText = document.getElementById('card-front-text');
  const backText = document.getElementById('card-back-text');
  const exampleEl = document.getElementById('card-example');
  const translationEl = document.getElementById('card-translation');
  const btnKnown = document.getElementById('btn-known');
  const btnLearning = document.getElementById('btn-learning');

  // Populate front
  frontText.textContent = card.front;

  // Populate back
  backText.textContent = card.back;

  // Optional example field (Req 3.3)
  if (card.example) {
    exampleEl.textContent = card.example;
    exampleEl.hidden = false;
  } else {
    exampleEl.textContent = '';
    exampleEl.hidden = true;
  }

  // Optional translation field (Req 3.4)
  if (card.translation) {
    translationEl.textContent = card.translation;
    translationEl.hidden = false;
  } else {
    translationEl.textContent = '';
    translationEl.hidden = true;
  }

  // Flip state (Req 4.3)
  if (state.isFlipped) {
    cardEl.classList.add('card--flipped');
  } else {
    cardEl.classList.remove('card--flipped');
  }

  // Known/Still Learning buttons enabled only when flipped (Req 6.1, 6.2)
  if (state.isFlipped) {
    btnKnown.disabled = false;
    btnKnown.classList.remove('btn--disabled');
    btnLearning.disabled = false;
    btnLearning.classList.remove('btn--disabled');
  } else {
    btnKnown.disabled = true;
    btnKnown.classList.add('btn--disabled');
    btnLearning.disabled = true;
    btnLearning.classList.add('btn--disabled');
  }

  // Update deck title (Req 3.6)
  const deckTitle = document.getElementById('deck-title');
  if (deckTitle && state.activeDeck) {
    deckTitle.textContent = state.activeDeck.subcategory;
  }

  // Update review mode label
  const reviewLabel = document.getElementById('review-mode-label');
  if (reviewLabel) {
    reviewLabel.hidden = !state.isReviewMode;
  }

  // Update shuffle button pressed state
  const btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) {
    btnShuffle.setAttribute('aria-pressed', state.isShuffled ? 'true' : 'false');
  }

  // Update Review Weak Cards button disabled state (Req 9.5)
  updateReviewButtonState();

  renderProgressIndicator();
}

/**
 * Updates the disabled state of the Review Weak Cards button.
 * Disabled when no cards in the active deck have "learning" status.
 * Requirements: 9.5
 */
function updateReviewButtonState() {
  const btnReview = document.getElementById('btn-review');
  if (!btnReview || !state.activeDeck) return;

  const hasWeakCards = state.activeDeck.cards.some((card, cardIndex) => {
    let cardId;
    if (state.activeSubDeckIndex !== -1) {
      // Hierarchical deck - use sub-deck ID
      cardId = generateSubDeckCardId(state.activeDeckIndex, state.activeSubDeckIndex, cardIndex);
    } else {
      // Regular deck
      cardId = generateCardId(state.activeDeckIndex, cardIndex);
    }
    return state.progress[cardId] === 'learning';
  });

  if (hasWeakCards) {
    btnReview.disabled = false;
    btnReview.classList.remove('btn--disabled');
    btnReview.title = 'Review cards marked as Still Learning';
  } else {
    btnReview.disabled = true;
    btnReview.classList.add('btn--disabled');
    btnReview.title = 'No cards marked as Still Learning in this deck';
  }
}

/**
 * Updates the "Card N of M" progress indicator.
 * Requirements: 3.5, 5.5
 */
function renderProgressIndicator() {
  const indicator = document.getElementById('progress-indicator');
  if (!indicator) return;
  const total = state.displayCards.length;
  const current = total > 0 ? state.currentIndex + 1 : 0;
  indicator.textContent = total > 0 ? `Card ${current} of ${total}` : '';
}

/**
 * Shows the deck-complete screen and hides the card + controls.
 * Requirements: 5.5, 5.6, 5.7, 9.2
 */
function renderDeckComplete() {
  const cardEl = document.getElementById('card');
  const controls = document.getElementById('controls');
  const deckComplete = document.getElementById('deck-complete');
  const progressIndicator = document.getElementById('progress-indicator');

  if (cardEl) cardEl.hidden = true;
  if (controls) controls.hidden = true;
  if (progressIndicator) progressIndicator.hidden = true;
  if (deckComplete) deckComplete.hidden = false;

  // Update Review Weak Cards button on complete screen
  const btnReviewComplete = document.getElementById('btn-review-complete');
  if (btnReviewComplete && state.activeDeck) {
    const hasWeakCards = state.activeDeck.cards.some((card, cardIndex) => {
      let cardId;
      if (state.activeSubDeckIndex !== -1) {
        cardId = generateSubDeckCardId(state.activeDeckIndex, state.activeSubDeckIndex, cardIndex);
      } else {
        cardId = generateCardId(state.activeDeckIndex, cardIndex);
      }
      return state.progress[cardId] === 'learning';
    });
    if (hasWeakCards) {
      btnReviewComplete.disabled = false;
      btnReviewComplete.classList.remove('btn--disabled');
    } else {
      btnReviewComplete.disabled = true;
      btnReviewComplete.classList.add('btn--disabled');
      btnReviewComplete.title = 'No cards marked as Still Learning in this deck';
    }
  }
}

/**
 * Shows the card and controls (used when leaving deck-complete screen).
 */
function showCardView() {
  const cardEl = document.getElementById('card');
  const controls = document.getElementById('controls');
  const deckComplete = document.getElementById('deck-complete');
  const progressIndicator = document.getElementById('progress-indicator');

  if (cardEl) cardEl.hidden = false;
  if (controls) controls.hidden = false;
  if (progressIndicator) progressIndicator.hidden = false;
  if (deckComplete) deckComplete.hidden = true;
}

/**
 * Shows the error region with a human-readable message.
 * Hides the navigator and viewport.
 * Requirements: 1.3
 */
function renderError(msg) {
  const errorEl = document.getElementById('error-message');
  const nav = document.getElementById('navigator');
  const viewport = document.getElementById('viewport');

  if (nav) nav.hidden = true;
  if (viewport) viewport.hidden = true;
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// 5. State mutations
// ---------------------------------------------------------------------------

/**
 * Activates a deck by index. If the deck is hierarchical (has subDecks),
 * automatically activates its first sub-deck instead.
 * Requirements: 2.3, 5.2, 5.3, 5.4, 5.5
 */
function activateDeck(deckIndex) {
  const deck = state.decks[deckIndex];
  if (!deck) return;

  // If this deck has sub-decks, delegate to activateSubDeck for the first group
  if (deck.subDecks && deck.subDecks.length > 0) {
    activateSubDeck(deckIndex, 0);
    return;
  }

  state.activeDeck = deck;
  state.activeDeckIndex = deckIndex;
  state.activeSubDeckIndex = -1; // -1 means not a sub-deck
  state.currentIndex = 0;
  state.isFlipped = false;
  state.isShuffled = false;
  state.isReviewMode = false;
  deriveDisplayCards();
  showCardView();
  renderNavigator();
  renderCard();
}

/**
 * Activates a specific sub-deck within a hierarchical deck.
 * Used for hierarchical decks with subDecks array.
 * Requirements: hierarchical navigation
 */
function activateSubDeck(deckIndex, subDeckIndex) {
  const deck = state.decks[deckIndex];
  if (!deck || !deck.subDecks || !deck.subDecks[subDeckIndex]) return;

  // Create a virtual deck from the sub-deck so the rest of the app works unchanged
  state.activeDeck = {
    category: deck.category,
    subcategory: deck.subcategory + ' › ' + deck.subDecks[subDeckIndex].groupName,
    cards: deck.subDecks[subDeckIndex].cards
  };
  state.activeDeckIndex = deckIndex;
  state.activeSubDeckIndex = subDeckIndex;
  state.currentIndex = 0;
  state.isFlipped = false;
  state.isShuffled = false;
  state.isReviewMode = false;
  deriveDisplayCards();
  showCardView();
  renderNavigator();
  renderCard();
}

/**
 * Activates the first deck in state.decks. Called on initial load.
 */
function activateFirstDeck() {
  if (state.decks.length > 0) {
    activateDeck(0);
  }
}

/**
 * Toggles the card flip state and re-renders the card.
 * Requirements: 4.1, 4.2
 */
function flipCard() {
  state.isFlipped = !state.isFlipped;
  renderCard();
}

/**
 * Navigates to the next (+1) or previous (-1) card.
 * Resets flip state on navigation (Req 5.4).
 * Shows deck-complete screen when advancing past the last card (Req 5.5).
 * Requirements: 5.2, 5.3, 5.4, 5.5
 *
 * @param {number} direction - +1 for next, -1 for previous
 */
function navigateCard(direction) {
  const newIndex = state.currentIndex + direction;

  if (newIndex >= state.displayCards.length) {
    // Past the last card — show deck complete screen
    renderDeckComplete();
    return;
  }

  if (newIndex < 0) {
    // Already at first card — do nothing
    return;
  }

  state.currentIndex = newIndex;
  state.isFlipped = false; // Req 5.4
  showCardView();
  renderCard();
}

/**
 * Marks the current card with the given status and persists to localStorage.
 * Overwrites any previous status for this card (Req 6.6).
 * Requirements: 6.3, 6.4, 6.6, 7.1, 7.4, 7.5
 *
 * @param {'known'|'learning'} status
 */
function markCard(status) {
  const card = state.displayCards[state.currentIndex];
  if (!card) return;

  // Find the original index of this card in the deck to get a stable Card_ID
  const originalIndex = state.activeDeck.cards.indexOf(card);
  if (originalIndex === -1) return;

  let cardId;
  if (state.activeSubDeckIndex !== -1) {
    // Hierarchical deck - use sub-deck ID
    cardId = generateSubDeckCardId(state.activeDeckIndex, state.activeSubDeckIndex, originalIndex);
  } else {
    // Regular deck
    cardId = generateCardId(state.activeDeckIndex, originalIndex);
  }

  state.progress[cardId] = status;

  // Persist to localStorage (Req 7.1)
  try {
    localStorage.setItem('flashcard-progress', JSON.stringify(state.progress));
  } catch (e) {
    // localStorage unavailable — silently continue
  }

  // Re-render navigator to update badges and card to update button states
  renderNavigator();
  renderCard();
}

/**
 * Clears all progress from localStorage and re-renders.
 * Requirements: 7.4, 7.5
 */
function resetProgress() {
  try {
    localStorage.removeItem('flashcard-progress');
  } catch (e) {
    // localStorage unavailable — silently continue
  }
  state.progress = {};
  renderNavigator();
  renderCard();
}

/**
 * Toggles shuffle mode. When activating, shuffles the current deck.
 * When deactivating, restores original order.
 * Requirements: 8.2, 8.3, 8.4
 */
function toggleShuffle() {
  state.isShuffled = !state.isShuffled;
  state.isReviewMode = false; // shuffle and review are mutually exclusive
  state.currentIndex = 0;
  state.isFlipped = false;
  deriveDisplayCards();
  showCardView();
  renderCard();
}

/**
 * Enters Review Mode, filtering the deck to only "learning" cards.
 * Requirements: 9.3, 9.4
 */
function activateReviewMode() {
  state.isReviewMode = true;
  state.isShuffled = false;
  state.currentIndex = 0;
  state.isFlipped = false;
  deriveDisplayCards();

  if (state.displayCards.length === 0) {
    // No weak cards — exit review mode
    state.isReviewMode = false;
    deriveDisplayCards();
  }

  showCardView();
  renderCard();
}

// ---------------------------------------------------------------------------
// 6. Event handlers
// ---------------------------------------------------------------------------

/**
 * Handles clicks on the navigator.
 * - Category click: toggles .nav__category--open on the category element
 * - Subcategory click (expandable): toggles .nav__subcategory--open on the subcategory element
 * - Sub-deck click: calls activateSubDeck(deckIndex, subDeckIndex)
 * - Regular subcategory click: calls activateDeck(deckIndex)
 * Also handles mobile nav toggle (hamburger button).
 * Requirements: 2.2, 2.3
 */
function handleNavClick(e) {
  // Check for sub-deck click (Group 1, Group 2, etc.)
  const subdeck = e.target.closest('.nav__subdeck');
  if (subdeck) {
    const deckIndex = parseInt(subdeck.dataset.deckIndex, 10);
    const subDeckIndex = parseInt(subdeck.dataset.subDeckIndex, 10);
    if (!isNaN(deckIndex) && !isNaN(subDeckIndex)) {
      activateSubDeck(deckIndex, subDeckIndex);
      // Close nav on mobile after selection
      closeNav();
    }
    return;
  }

  // Check for expandable subcategory click (P-A1-1, P-A1-1 Reinforcement, etc.)
  const expandableSubcategory = e.target.closest('.nav__subcategory--expandable');
  if (expandableSubcategory) {
    const isOpen = expandableSubcategory.classList.toggle('nav__subcategory--open');
    expandableSubcategory.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    return;
  }

  // Check for regular subcategory click (non-hierarchical decks)
  const subcategory = e.target.closest('.nav__subcategory');
  if (subcategory) {
    const deckIndex = parseInt(subcategory.dataset.deckIndex, 10);
    if (!isNaN(deckIndex)) {
      activateDeck(deckIndex);
      // Close nav on mobile after selection
      closeNav();
    }
    return;
  }

  // Check for category click
  const category = e.target.closest('.nav__category');
  if (category) {
    const isOpen = category.classList.toggle('nav__category--open');
    category.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

/**
 * Opens the mobile nav overlay.
 */
function openNav() {
  const nav = document.getElementById('navigator');
  const backdrop = document.getElementById('nav-backdrop');
  const toggle = document.getElementById('nav-toggle');
  if (nav) nav.classList.add('nav--open');
  if (backdrop) backdrop.classList.add('nav-backdrop--visible');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
}

/**
 * Closes the mobile nav overlay.
 */
function closeNav() {
  const nav = document.getElementById('navigator');
  const backdrop = document.getElementById('nav-backdrop');
  const toggle = document.getElementById('nav-toggle');
  if (nav) nav.classList.remove('nav--open');
  if (backdrop) backdrop.classList.remove('nav-backdrop--visible');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

/**
 * Handles card click/tap — flips the card.
 * Requirements: 4.1, 12.2
 */
function handleCardClick(e) {
  // Don't flip if the speaker button was clicked
  if (e.target.closest('#btn-speaker')) return;
  flipCard();
}

/**
 * Handles keyboard navigation.
 * Space/Enter → flip; ArrowRight → next; ArrowLeft → prev
 * Requirements: 4.2, 5.2, 5.3, 12.2
 */
function handleKeyDown(e) {
  // Don't intercept if focus is on a button (let the button handle it)
  if (e.target.tagName === 'BUTTON' && e.key !== ' ') return;

  switch (e.key) {
    case ' ':
    case 'Enter':
      // Only flip if the card or a non-button element is focused
      if (e.target.id === 'card' || e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        flipCard();
      }
      break;
    case 'ArrowRight':
      e.preventDefault();
      navigateCard(+1);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      navigateCard(-1);
      break;
  }
}

/**
 * Handles clicks on the controls bar and deck header via event delegation.
 * Delegates to: Known, Still Learning, Shuffle, Review Weak Cards,
 * Restart, Review Weak Cards (complete screen), Reset Progress, Prev, Next.
 * Requirements: 5.1, 6.3, 6.4, 7.4, 7.5, 8.1, 9.1
 */
function handleControlsClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  switch (btn.id) {
    case 'btn-known':
      markCard('known');
      break;
    case 'btn-learning':
      markCard('learning');
      break;
    case 'btn-shuffle':
      toggleShuffle();
      break;
    case 'btn-review':
      activateReviewMode();
      break;
    case 'btn-restart':
      activateDeck(state.activeDeckIndex);
      break;
    case 'btn-review-complete':
      activateReviewMode();
      break;
    case 'btn-reset':
      resetProgress();
      break;
    case 'btn-prev':
      navigateCard(-1);
      break;
    case 'btn-next':
      navigateCard(+1);
      break;
  }
}

/**
 * Handles speaker button click — speaks the card front text using SpeechSynthesis.
 * Requirements: 10.1, 10.2
 */
function handleSpeakerClick(e) {
  e.stopPropagation(); // prevent card flip
  const card = state.displayCards[state.currentIndex];
  if (!card) return;

  const utterance = new SpeechSynthesisUtterance(card.front);
  utterance.lang = 'es-ES';
  speechSynthesis.speak(utterance);
}

/**
 * Attaches all event listeners. Called once after initApp bootstraps the DOM.
 * Uses event delegation on stable parent containers.
 */
function attachEventListeners() {
  // Navigator
  const nav = document.getElementById('navigator');
  if (nav) nav.addEventListener('click', handleNavClick);

  // Nav keyboard accessibility
  if (nav) {
    nav.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNavClick(e);
      }
    });
  }

  // Mobile nav toggle (hamburger)
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const nav = document.getElementById('navigator');
      if (nav && nav.classList.contains('nav--open')) {
        closeNav();
      } else {
        openNav();
      }
    });
  }

  // Nav backdrop (close on outside click)
  const backdrop = document.getElementById('nav-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeNav);

  // Card flip
  const cardEl = document.getElementById('card');
  if (cardEl) cardEl.addEventListener('click', handleCardClick);

  // Keyboard navigation (global)
  document.addEventListener('keydown', handleKeyDown);

  // Controls bar (Prev, Next, Known, Still Learning)
  const controls = document.getElementById('controls');
  if (controls) controls.addEventListener('click', handleControlsClick);

  // Deck header (Shuffle, Review Weak Cards)
  const deckHeader = document.querySelector('.deck-header');
  if (deckHeader) deckHeader.addEventListener('click', handleControlsClick);

  // Deck complete screen (Restart, Review Weak Cards)
  const deckComplete = document.getElementById('deck-complete');
  if (deckComplete) deckComplete.addEventListener('click', handleControlsClick);

  // Reset Progress button
  const resetArea = document.querySelector('.reset-area');
  if (resetArea) resetArea.addEventListener('click', handleControlsClick);

  // Speaker button
  const speakerBtn = document.getElementById('btn-speaker');
  if (speakerBtn) speakerBtn.addEventListener('click', handleSpeakerClick);
}

// Bootstrap the app once the DOM is ready (script is deferred so DOM is ready)
initApp();
