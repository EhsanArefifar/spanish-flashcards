# Project Structure

## Repository Layout

```
flashcards/
│
├── index.html          # Single-page app entry point — all layout lives here
├── style.css           # All styles — no CSS frameworks, no preprocessors
├── app.js              # All application logic — vanilla JS, no bundler
├── cards.json          # ALL flashcard content — the only file the owner edits regularly
│
├── assets/
│   └── icons/          # Any SVG icons used in the UI (optional, inline SVG preferred)
│
└── README.md           # How to add cards, run locally, deploy to GitHub Pages
```

## File Responsibilities

### `index.html`
- Structural shell only — no hardcoded card content
- Imports `style.css`, `app.js`, and fetches `cards.json` at runtime
- Contains the DOM scaffolding: header, deck selector, flashcard viewport, controls bar

### `style.css`
- All visual styling including the 3D flip animation
- CSS custom properties (variables) for the color theme at the top of the file
- Mobile-first responsive layout using CSS Grid/Flexbox
- No external stylesheets or CDN imports

### `app.js`
- Fetches and parses `cards.json` on page load
- Dynamically builds the deck navigation from JSON categories and subcategories
- Renders the active card and handles all user interactions
- Reads and writes progress state to `localStorage`
- No external JS libraries or frameworks

### `cards.json`
- Single source of truth for all flashcard content
- Schema-driven: every deck has `category`, `subcategory`, and a `cards` array
- Each card has: `front`, `back`, and optionally `example` + `translation`
- This is the only file the owner needs to touch to add new content

### `README.md`
- Step-by-step instructions for adding new cards
- How to run locally (VS Code Live Server)
- How to deploy / update on GitHub Pages

## Constraints
- **No `node_modules`** — this is not an npm project
- **No build output folders** — what you see in the repo is what gets served
- **No `.env` files** — no secrets, no API keys needed
- **GitHub Pages serves the repo root** — `index.html` at root is required
