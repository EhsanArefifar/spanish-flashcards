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
- **`localStorage`** — to persist progress (known/unknown cards) between sessions
- **`SpeechSynthesis` (Web Speech API)** — optional audio pronunciation, built into all modern browsers
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
  activeDeck: null,    // { category, subcategory, cards[] }
  currentIndex: 0,
  isFlipped: false,
  progress: {}         // { "cardId": "known" | "learning" }
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
      "category": "string — top-level group shown in nav (e.g. 'Verbs')",
      "subcategory": "string — sub-group (e.g. 'Daily Routine')",
      "cards": [
        {
          "front": "string — Spanish word or phrase",
          "back": "string — English translation",
          "example": "string (optional) — Spanish example sentence",
          "translation": "string (optional) — English translation of example"
        }
      ]
    }
  ]
}
```

- `front` and `back` are **required**
- `example` and `translation` are **optional** — shown below the card back when present
- The combination of `category + subcategory` must be unique — it acts as the deck identifier
- Card order within a deck is the default study order; shuffle is handled in JS at runtime

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