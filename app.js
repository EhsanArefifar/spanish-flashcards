/**
 * app.js — Spanish Flashcard App
 *
 * Single-file vanilla JavaScript application (ES2020+, no modules).
 * All functions share the same script scope.
 *
 * Sections (added incrementally across tasks):
 *   1. State object
 *   2. Pure data functions: cyrb53, getCardId, getGroupKey, getReviewStatus, getSpeechText, shuffleDeck, getWeakCards, deriveDisplayCards
 *   3. Initialization & progress persistence: loadProgressFromStorage, saveProgress, migrateLegacyProgress, initApp
 *   4. Rendering functions: renderNavigator, renderCard, renderProgressIndicator, renderError
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
  progress: {},        // Record<CardId, "known" | "learning">
  practice: {},        // Record<GroupKey, { last: "YYYY-MM-DD", sessions: number }>
  migratedFromV1: false // true once old position-based progress has been converted
};

// ---------------------------------------------------------------------------
// 2. Pure data functions
// ---------------------------------------------------------------------------

/**
 * 53-bit string hash (cyrb53, public domain). Used to derive stable card IDs.
 *
 * @param {string} str
 * @returns {number}
 */
function cyrb53(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const cardIdCache = new WeakMap();

/**
 * Derives a stable Card_ID from the card's content (front + back), so progress
 * stays attached to the card when decks or groups are reordered, renamed or
 * merged. Editing a card's front or back gives it a new ID, which resets its
 * progress — intended, since the sentence to learn has changed.
 *
 * @param {Object} card
 * @returns {string}
 */
function getCardId(card) {
  let id = cardIdCache.get(card);
  if (!id) {
    id = 'c' + cyrb53(`${(card.front || '').trim()}\u241F${(card.back || '').trim()}`).toString(36);
    cardIdCache.set(card, id);
  }
  return id;
}

/** Days until a group is due again, indexed by how many days it has been practised. */
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

/**
 * Stable key for a study group, e.g. "W-1 › Group 1 · Stand-up: done", or the
 * subcategory name for a flat deck. Matches the title shown above the card.
 *
 * @param {number} deckIndex
 * @param {number} subDeckIndex - -1 for a flat deck
 * @returns {string}
 */
function getGroupKey(deckIndex, subDeckIndex) {
  const deck = state.decks[deckIndex];
  if (subDeckIndex === -1) return deck.subcategory;
  return `${deck.subcategory} › ${deck.subDecks[subDeckIndex].groupName}`;
}

/** Local calendar date as "YYYY-MM-DD". */
function todayString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Whole days from one "YYYY-MM-DD" date to another (DST-safe). */
function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd)) / 86400000);
}

/**
 * When a group was last practised and whether it is due again. The gap grows
 * with each day the group has been practised (1, 3, 7, 14, 30, 60 days);
 * groups that still have "learning" cards come back within two days.
 *
 * @param {string} groupKey
 * @param {Array} cards - the group's cards
 * @returns {{daysAgo: number, due: boolean} | null} null if never practised
 */
function getReviewStatus(groupKey, cards) {
  const entry = state.practice[groupKey];
  if (!entry || !entry.last) return null;
  const daysAgo = daysBetween(entry.last, todayString());
  const step = Math.min(Math.max(entry.sessions, 1), REVIEW_INTERVALS.length) - 1;
  let interval = REVIEW_INTERVALS[step];
  if (cards.some(card => state.progress[getCardId(card)] === 'learning')) {
    interval = Math.min(interval, 2);
  }
  return { daysAgo, due: daysAgo >= interval };
}

/**
 * The Spanish text to read aloud for one face of a card, or '' if that face
 * has no Spanish. Decks with "frontLanguage": "en" have an English prompt on
 * the front and the Spanish answer on the back; other decks have Spanish on
 * the front and an English definition on the back.
 *
 * @param {Object} card
 * @param {'front'|'back'} face
 * @returns {string}
 */
function getSpeechText(card, face) {
  const frontIsSpanish = !state.activeDeck || state.activeDeck.frontLanguage !== 'en';
  if (face === 'front') {
    return card.context || (frontIsSpanish ? card.front : '');
  }
  if (frontIsSpanish) {
    return card.example || card.front;
  }
  // End each sentence with punctuation so the voice pauses between them
  return [card.back, card.example]
    .filter(Boolean)
    .map(text => text.trim())
    .map(text => (/[.!?…]$/.test(text) ? text : `${text}.`))
    .join(' ');
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
 * given progress map.
 *
 * @param {Object} deck       - A deck object with a `cards` array
 * @param {Object} progress   - Record<CardId, "known" | "learning">
 * @returns {Array}           - Filtered array of cards with "learning" status
 */
function getWeakCards(deck, progress) {
  if (!deck || !deck.cards) return [];
  return deck.cards.filter(card => progress[getCardId(card)] === 'learning');
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

const STORAGE_KEY = 'flashcard-progress-v2';
const LEGACY_STORAGE_KEY = 'flashcard-progress';          // v1: position-based keys
const LEGACY_BACKUP_KEY = 'flashcard-progress-v1-backup';

/**
 * Reads the stored progress (card marks + group practice dates) from
 * localStorage into state. Wrapped in try/catch so private-browsing
 * restrictions don't crash the app.
 */
function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.progress = saved.cards || {};
      state.practice = saved.groups || {};
      state.migratedFromV1 = Boolean(saved.migratedFromV1);
    }
  } catch (e) {
    // localStorage unavailable or JSON malformed — silently continue
    state.progress = {};
    state.practice = {};
  }
}

/**
 * Writes card marks and group practice dates to localStorage.
 */
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cards: state.progress,
      groups: state.practice,
      migratedFromV1: state.migratedFromV1
    }));
  } catch (e) {
    // localStorage unavailable — silently continue
  }
}

/**
 * One-time conversion of v1 progress, whose keys ("deck-1-sub-0-card-3")
 * pointed at whatever card sat in that position, to content-based Card_IDs.
 * progress-migration.json maps each v1 key to the ID of the card that was in
 * that position before the switch; cards whose text was corrected since then
 * are left out, so they come back unmarked. Marks already saved in v2 win.
 *
 * @returns {Promise<void>} always resolves; on failure v1 data is kept for next load
 */
function migrateLegacyProgress() {
  let legacy = null;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch (e) {
    return Promise.resolve();
  }
  if (!legacy || state.migratedFromV1) return Promise.resolve();

  return fetch('progress-migration.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(map => {
      Object.entries(legacy).forEach(([oldKey, status]) => {
        const cardId = map[oldKey];
        if (cardId && !(cardId in state.progress)) state.progress[cardId] = status;
      });
      state.migratedFromV1 = true;
      saveProgress();
      localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    })
    .catch(() => {
      // Offline or file missing — keep the v1 data and try again on next load
    });
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
      return migrateLegacyProgress().then(() => {
        renderNavigator();
        activateFirstDeck();
      });
    })
    .catch(err => {
      renderError(err.message || 'Failed to load cards.json. Please check the file and try again.');
    });
}

// ---------------------------------------------------------------------------
// 4. Rendering functions
// ---------------------------------------------------------------------------

/** "today", "yesterday" or "3d ago". */
function formatDaysAgo(days) {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/** Card count for a nav row, plus when the group was last practised. */
function formatCardCount(cards, review) {
  const count = `${cards.length} cards`;
  return review ? `${count} · ${formatDaysAgo(review.daysAgo)}` : count;
}

function createBadge(modifier, text, title) {
  const badge = document.createElement('span');
  badge.className = `badge ${modifier}`;
  badge.textContent = text;
  badge.setAttribute('title', title);
  return badge;
}

/**
 * Badges for one study group: a review badge when it is due, then the
 * known / still-learning counts. Each badge is only shown when non-empty.
 * Requirements: 6.5
 *
 * @param {Array} cards
 * @param {{daysAgo: number, due: boolean} | null} review
 * @returns {HTMLElement}
 */
function buildBadges(cards, review) {
  const badgesDiv = document.createElement('div');
  badgesDiv.className = 'nav__badges';

  let knownCount = 0;
  let learningCount = 0;
  cards.forEach(card => {
    const status = state.progress[getCardId(card)];
    if (status === 'known') knownCount++;
    else if (status === 'learning') learningCount++;
  });

  if (review && review.due) {
    badgesDiv.appendChild(createBadge('badge--due', '↻', `Due for review (last practised ${formatDaysAgo(review.daysAgo)})`));
  }
  if (knownCount > 0) {
    badgesDiv.appendChild(createBadge('badge--known', knownCount, `${knownCount} known`));
  }
  if (learningCount > 0) {
    badgesDiv.appendChild(createBadge('badge--learning', learningCount, `${learningCount} still learning`));
  }
  return badgesDiv;
}

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

        // Show how many groups are due, so they can be found without expanding
        const dueGroups = deck.subDecks.filter((subDeck, subDeckIndex) => {
          const review = getReviewStatus(getGroupKey(deckIndex, subDeckIndex), subDeck.cards);
          return review && review.due;
        }).length;
        if (dueGroups > 0) {
          const dueSpan = document.createElement('span');
          dueSpan.className = 'nav__due';
          dueSpan.textContent = ` · ↻ ${dueGroups} to review`;
          mainCountSpan.appendChild(dueSpan);
        }

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

          const review = getReviewStatus(getGroupKey(deckIndex, subDeckIndex), subDeck.cards);

          const subLabelDiv = document.createElement('div');
          subLabelDiv.className = 'nav__label';

          const subNameSpan = document.createElement('span');
          subNameSpan.textContent = subDeck.groupName;

          const subCountSpan = document.createElement('span');
          subCountSpan.className = 'nav__count';
          subCountSpan.textContent = formatCardCount(subDeck.cards, review);

          subLabelDiv.appendChild(subNameSpan);
          subLabelDiv.appendChild(subCountSpan);

          subLi.appendChild(subLabelDiv);
          subLi.appendChild(buildBadges(subDeck.cards, review));

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

        const review = getReviewStatus(getGroupKey(deckIndex, -1), deck.cards);

        const nameLabelDiv = document.createElement('div');
        nameLabelDiv.className = 'nav__label';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = deck.subcategory;

        const subcategoryCountSpan = document.createElement('span');
        subcategoryCountSpan.className = 'nav__count';
        subcategoryCountSpan.textContent = formatCardCount(deck.cards, review);

        nameLabelDiv.appendChild(nameSpan);
        nameLabelDiv.appendChild(subcategoryCountSpan);

        li.appendChild(nameLabelDiv);
        li.appendChild(buildBadges(deck.cards, review));

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

  // Optional dialogue context: a colleague's line in Spanish, shown above the gist
  const contextEl = document.getElementById('card-context');
  if (contextEl) {
    contextEl.textContent = card.context ? `«${card.context}»` : '';
    contextEl.hidden = !card.context;
  }
  cardEl.classList.toggle('card--dialogue', Boolean(card.context));

  // Optional Persian equivalents of key expressions ({ "spanish": "persian" }):
  // the Persian alone on the front as a cue, Spanish = Persian pairs on the back
  const faPairs = card.fa ? Object.entries(card.fa) : [];
  const frontFaEl = document.getElementById('card-front-fa');
  if (frontFaEl) {
    frontFaEl.textContent = faPairs.map(([, fa]) => fa).join(' · ');
    frontFaEl.hidden = faPairs.length === 0;
  }
  const backFaEl = document.getElementById('card-back-fa');
  if (backFaEl) {
    backFaEl.innerHTML = '';
    faPairs.forEach(([es, fa]) => {
      const item = document.createElement('li');
      const esSpan = document.createElement('span');
      esSpan.lang = 'es';
      esSpan.textContent = es;
      const faSpan = document.createElement('span');
      faSpan.lang = 'fa';
      faSpan.dir = 'rtl';
      faSpan.textContent = fa;
      item.append(esSpan, ' = ', faSpan);
      backFaEl.appendChild(item);
    });
    backFaEl.hidden = faPairs.length === 0;
  }

  // Speaker buttons only appear on faces that have Spanish to read (Req 10.1)
  const btnSpeaker = document.getElementById('btn-speaker');
  if (btnSpeaker) btnSpeaker.hidden = !getSpeechText(card, 'front');
  const btnSpeakerBack = document.getElementById('btn-speaker-back');
  if (btnSpeakerBack) btnSpeakerBack.hidden = !getSpeechText(card, 'back');

  // Optional front example (English cue for the follow-up sentence)
  const frontExampleEl = document.getElementById('card-front-example');
  if (frontExampleEl) {
    if (card['front example']) {
      frontExampleEl.textContent = card['front example'];
      frontExampleEl.hidden = false;
    } else {
      frontExampleEl.textContent = '';
      frontExampleEl.hidden = true;
    }
  }

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

  const hasWeakCards = state.activeDeck.cards.some(card => state.progress[getCardId(card)] === 'learning');

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
    frontLanguage: deck.frontLanguage,
    cards: deck.subDecks[subDeckIndex].cards
  };
  state.activeDeckIndex = deckIndex;
  state.activeSubDeckIndex = subDeckIndex;
  state.currentIndex = 0;
  state.isFlipped = false;
  state.isShuffled = false;
  state.isReviewMode = false;
  deriveDisplayCards();

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
 * Wraps around when advancing past the last card.
 *
 * @param {number} direction - +1 for next, -1 for previous
 */
function navigateCard(direction) {
  const newIndex = state.currentIndex + direction;

  if (newIndex >= state.displayCards.length) {
    // Past the last card — wrap back to first
    state.currentIndex = 0;
    state.isFlipped = false;
    renderCard();
    return;
  }

  if (newIndex < 0) {
    // Already at first card — do nothing
    return;
  }

  state.currentIndex = newIndex;
  state.isFlipped = false;
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

  state.progress[getCardId(card)] = status;
  recordPractice(getGroupKey(state.activeDeckIndex, state.activeSubDeckIndex));

  // Persist to localStorage (Req 7.1)
  saveProgress();

  // Re-render navigator to update badges and card to update button states
  renderNavigator();
  renderCard();
}

/**
 * Notes that a group was practised today. Each new day counts as one more
 * session, which lengthens the gap before the group is due again.
 *
 * @param {string} groupKey
 */
function recordPractice(groupKey) {
  const today = todayString();
  const entry = state.practice[groupKey] || { last: null, sessions: 0 };
  if (entry.last !== today) {
    entry.sessions += 1;
    entry.last = today;
  }
  state.practice[groupKey] = entry;
}

/**
 * Clears all progress from localStorage and re-renders, after confirmation.
 * Requirements: 7.4, 7.5
 */
function resetProgress() {
  if (!window.confirm('Reset progress for ALL decks? Every Known / Still Learning mark will be cleared.')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    // localStorage unavailable — silently continue
  }
  state.progress = {};
  state.practice = {};
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
  // Don't flip if a speaker button was clicked
  if (e.target.closest('.btn--speaker')) return;
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
 * Handles speaker button clicks — reads the Spanish on that face of the card
 * (see getSpeechText) with a Spain Spanish voice when the device has one.
 * Requirements: 10.1, 10.2
 */
function handleSpeakerClick(e) {
  e.stopPropagation(); // prevent card flip
  const card = state.displayCards[state.currentIndex];
  if (!card) return;

  const text = getSpeechText(card, e.currentTarget.dataset.face);
  if (!text) return;

  speechSynthesis.cancel(); // don't queue behind a sentence that is still playing
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  const voice = speechSynthesis.getVoices().find(v => /^es[-_]ES/i.test(v.lang));
  if (voice) utterance.voice = voice;
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

  // Reset Progress button
  const resetArea = document.querySelector('.reset-area');
  if (resetArea) resetArea.addEventListener('click', handleControlsClick);

  // Speaker buttons (one per card face)
  ['btn-speaker', 'btn-speaker-back'].forEach(id => {
    const speakerBtn = document.getElementById(id);
    if (speakerBtn) speakerBtn.addEventListener('click', handleSpeakerClick);
  });
}

// Bootstrap the app once the DOM is ready (script is deferred so DOM is ready)
initApp();
