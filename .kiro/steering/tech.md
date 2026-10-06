# Tech Stack & Conventions

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Markup | HTML5 (semantic) | No framework needed for a single-page static app |
| Styling | Vanilla CSS with custom properties | No build step, full control, easy to read and edit |
| Logic | Vanilla JavaScript (ES2020+) | No bundler, no npm, no dependencies to maintain |
| Data | JSON (cards.json) | Human-readable, easy to edit, fetched at runtime |
| Hosting | GitHub Pages | Free, auto-deploys on push, zero config |
| Local dev | VS Code + Live Server extension | Serves files with HTTP (required for fetch()), one-click start |

## Browser APIs Used (No Libraries Needed)

- **`fetch()`** — to load `cards.json` at runtime
- **`localStorage`** — to persist progress (known/learning cards, group practice dates) between sessions
- **`SpeechSynthesis` (Web Speech API)** — Spanish (es-ES) audio for the Spanish text on each card face, built into all modern browsers
- **CSS 3D transforms** — for the card flip animation (`rotateY`, `perspective`, `backface-visibility`)

## JavaScript Conventions

- **ES modules are NOT used** — a single `app.js` file, loaded with `<script defer src="app.js">` in HTML
- **No `var`** — use `const` and `let` only
- **Event delegation** — attach events to parent containers, not individual cards
- **State object** — maintain a single `state` object in `app.js` tracking: `currentDeck`, `currentIndex`, `isFlipped`, `progress`
- **Pure functions** where possible — separate data transformation from DOM manipulation

```js
// State shape
const state = {
  decks: [],           // parsed from cards.json
  activeDeck: null,    // { category, subcategory, frontLanguage, cards[] }
  currentIndex: 0,
  isFlipped: false,
  progress: {},        // { "cardId": "known" | "learning" } — cardId = hash of front + back
  practice: {}         // { "W-1 › Group 1 · …": { last: "YYYY-MM-DD", sessions: 3 } }
};
```

## CSS Conventions

- **Custom properties** at `:root` for all colors and spacing — easy theming
- **BEM-like class naming**: `.card`, `.card__front`, `.card__back`, `.card--flipped`
- **Mobile-first** breakpoints — base styles for mobile, `@media (min-width: 768px)` for desktop
- **No `!important`** — specificity managed through structure

```css
/* Color tokens — edit here to retheme the whole site */
:root {
  --color-primary: #2563eb;
  --color-bg: #f8fafc;
  --color-card: #ffffff;
  --color-text: #1e293b;
  --color-known: #16a34a;
  --color-learning: #dc2626;
  --color-border: #e2e8f0;
  --radius-card: 16px;
}
```

## cards.json Schema

```json
{
  "decks": [
    {
      "category": "string — top-level group shown in nav (e.g. 'Work', 'Verbs')",
      "subcategory": "string — deck name (e.g. 'W-1')",
      "frontLanguage": "'en' (optional) — front is an English prompt, Spanish answer on the back",
      "subDecks": [
        {
          "groupName": "string — e.g. 'Group 1 · Stand-up: done' (10 cards per group)",
          "cards": [
            {
              "context": "string (optional) — a colleague's line in Spanish, shown above the prompt",
              "front": "string — prompt: Spanish expression, English sentence or English gist",
              "front example": "string (optional) — English cue for the follow-up sentence",
              "fa": "object (optional) — { 'Spanish expression': 'Persian equivalent' }",
              "back": "string — answer / meaning",
              "example": "string (optional) — Spanish follow-up or example sentence",
              "translation": "string (optional) — note: why this tense, meaning of an expression"
            }
          ]
        }
      ]
    }
  ]
}
```

- A deck has either `subDecks` (groups) or a flat `cards` array
- `front` and `back` are **required**; all other card fields are optional
- The combination of `category + subcategory` must be unique — it acts as the deck identifier
- Progress is keyed by a hash of `front` + `back`, so cards can move between decks/groups freely; editing `front` or `back` resets that card's progress
- Card order within a deck is the default study order; shuffle is handled in JS at runtime
- Content rules (Castilian usage, card formats): see `content.md`

## Deployment

- **GitHub Pages**: enable in repo Settings → Pages → Source: `main` branch, root folder
- No build command needed — GitHub Pages serves the files directly
- Update workflow: `git add cards.json` → `git commit -m "add food vocabulary deck"` → `git push`
- Changes are live within ~30 seconds of pushing

## Local Development

```bash
# Option 1: VS Code Live Server (recommended)
# Right-click index.html → "Open with Live Server"

# Option 2: Python (if installed)
python -m http.server 8080
# then open http://localhost:8080
```

> ⚠️ Do NOT open `index.html` by double-clicking it. The `fetch('cards.json')` call will fail due to browser CORS restrictions on `file://` protocol. Always use a local HTTP server.

## What to Avoid

- Do NOT add npm / package.json — this is not a Node project
- Do NOT add a CSS framework (Bootstrap, Tailwind) — unnecessary weight
- Do NOT add a JS framework (React, Vue) — overkill for this use case
- Do NOT add a bundler (Vite, Webpack) — defeats the zero-maintenance goal
- Do NOT use ES modules (`import/export`) — complicates local dev without a bundler