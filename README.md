# Spanish Flashcards

A static, zero-dependency flashcard app for building **speaking fluency in Castilian Spanish** through everyday chunks. No build step, no npm, no server required.

Where this is heading, and what each step covers, is in [`ROADMAP.md`](ROADMAP.md). Before writing new cards, read [`.kiro/steering/content.md`](.kiro/steering/content.md). It covers the card formats and the Castilian rules every card must follow.

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

Open `cards.json` and add a new object to the `decks` array. Decks are shown in the navigator in the order they appear in the file. A deck has either a flat `cards` array or `subDecks` of 10 cards each, one group per study sitting:

```json
{
  "category": "Work",
  "subcategory": "W-1",
  "frontLanguage": "en",
  "subDecks": [
    {
      "groupName": "Group 1 · Stand-up: done",
      "cards": [
        {
          "context": "¿Has terminado el informe?",
          "front": "not yet · meetings all day today · tomorrow first thing",
          "fa": { "a primera hora": "اول وقت" },
          "back": "Todavía no, hoy he tenido reuniones todo el día.",
          "example": "Te lo mando mañana a primera hora.",
          "translation": "Hoy → perfecto in Spain: «he tenido»."
        }
      ]
    }
  ]
}
```

Deck fields:
- `category` — top-level group shown in the navigator (e.g. "Work", "Verbs", "Vocabulary")
- `subcategory` — the deck name shown in the navigator and card header
- `frontLanguage` — `"en"` when the front is an English prompt and the Spanish answer is on the back. Omit it for decks with Spanish on the front. The 🔊 buttons use it so they only ever read Spanish.

Card fields:
- `front` — the prompt (required). Spanish expression, English sentence, or English gist keywords.
- `back` — the answer or meaning (required)
- `context` — optional Spanish line from a colleague, shown above the prompt and read by the front 🔊
- `fa` — optional Persian equivalents of key expressions, `{ "Spanish": "Persian" }`: Persian cue on the front, pairs on the back
- `front example` — optional English cue for the follow-up sentence (shown on the front)
- `example` — optional Spanish follow-up or example sentence (shown on the back)
- `translation` — optional note shown on the back (grammar reason or meaning)

The new deck appears in the navigator automatically on the next page load — no code changes needed.

## Add a Card to an Existing Deck

Find the deck in `cards.json` by its `subcategory` name and append a card object to its `cards` array (or to one of its `subDecks`):

```json
{ "front": "verde", "back": "green" }
```

## Progress

Known / Still Learning marks are saved in the browser (`localStorage`), keyed by each card's `front` + `back`. Moving, regrouping or renaming decks keeps them. Changing a card's `front` or `back` resets that card, because it is a new sentence to learn. The navigator shows when each group was last practised and marks it ↻ when it's due again.

`progress-migration.json` converts marks saved by the older version of the app (which keyed progress by card position). It runs once per browser and can be deleted once every device you study on has opened the new version.

## Run Property Tests

Open `test-properties.html` via Live Server (or Python server) to run the property-based test suite. All 12 properties should show ✓ PASS.
