# Spanish Flashcards

A static, zero-dependency flashcard app for studying Spanish vocabulary. No build step, no npm, no server required.

## Run Locally

> ⚠️ Always use a local HTTP server — opening `index.html` directly via `file://` will block `fetch()`.

**Option 1 — VS Code Live Server (recommended)**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → **Open with Live Server**
3. App opens at `http://127.0.0.1:5500`

**Option 2 — Python**

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Deploy to GitHub Pages

1. Push the repository to GitHub
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch, **/ (root)** folder
5. Click **Save** — the site is live at `https://<your-username>.github.io/<repo-name>/` within ~30 seconds

To update: edit `cards.json`, commit, and push. Changes go live automatically.

## Add a New Deck

Open `cards.json` and add a new object to the `decks` array:

```json
{
  "category": "Vocabulary",
  "subcategory": "Colors",
  "cards": [
    { "front": "rojo", "back": "red" },
    { "front": "azul", "back": "blue", "example": "El cielo es azul.", "translation": "The sky is blue." }
  ]
}
```

- `category` — top-level group shown in the navigator (e.g. "Verbs", "Vocabulary")
- `subcategory` — the deck name shown in the navigator and card header
- `front` — Spanish word or phrase (required)
- `back` — English translation (required)
- `example` — Spanish example sentence (optional, shown on card back)
- `translation` — English translation of the example (optional, shown below example)

The new deck appears in the navigator automatically on the next page load — no code changes needed.

## Add a Card to an Existing Deck

Find the deck in `cards.json` by its `subcategory` name and append a card object to its `cards` array:

```json
{ "front": "verde", "back": "green" }
```

## Run Property Tests

Open `test-properties.html` via Live Server (or Python server) to run the property-based test suite. All 12 properties should show ✓ PASS.
