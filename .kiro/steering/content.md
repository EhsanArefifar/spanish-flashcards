# Card Content Guide

Rules for writing and reviewing cards in `cards.json`. Every card so far has been AI-generated and none has been checked by a native speaker, so these rules exist to stop the most common AI mistakes. Paste this file into any AI tool used to generate cards.

## The learner and the goal

- Goal: **speaking fluency in Castilian Spanish (Spain)**, first of all at work. Work cards use a product-management office context: roadmap, requirements, stakeholders, launches, meetings.
- Present tense is easy. The bottlenecks are **choosing and conjugating tenses in real time**: pretérito perfecto (*he hecho*), indefinido, imperfecto, pluscuamperfecto, conditional and subjunctive.
- The present tense may appear as context, never as the thing being drilled.
- Translating word by word from English is a known trap, so prompts should cue meaning, not full sentences to translate. Persian equivalents (`fa`) anchor key expressions.

## How cards are studied

- The learner says the Spanish **out loud** before flipping, including the follow-up sentence.
- **Known** is pressed only when the sentence came out instantly.
- One group of 10 cards = one sitting (10–20 minutes). Keep groups at exactly 10 cards.
- The navigator shows when each group was last practised and marks it ↻ when it is due again (1, 3, 7, 14, 30, 60, 120 days; within 2 days if it still has Still Learning cards).

## Card formats

### 1. Dialogue cards (Work decks, `W-*`) — preferred for new content

```json
{
  "context": "¿Has terminado el informe?",
  "front": "not yet · meetings all day today · tomorrow first thing",
  "fa": { "a primera hora": "اول وقت" },
  "back": "Todavía no, hoy he tenido reuniones todo el día.",
  "example": "Te lo mando mañana a primera hora.",
  "translation": "Hoy → perfecto in Spain: «he tenido». a primera hora = first thing."
}
```

- `context`: what a colleague says, in natural Spanish (shown in «», read aloud by the front 🔊).
- `front`: the **gist** in English keywords separated by ` · `, never a full sentence. Include the time words (today, yesterday, if…) that decide the tense, but never name the tense.
- `fa`: optional. Persian equivalents for **key expressions only**, as `{ "Spanish expression": "Persian" }`. The Persian shows on the front as a cue; the pairs show on the back.
- `back` + `example`: the answer, as two short sentences someone would really say (8–16 words each).
- `translation`: the note. One or two short sentences on **why this tense**, plus any expression. Never put Persian in the note (mixed text directions render badly).

### 2. Production cards (Verbs decks, `P-*`)

English sentence on the front → Spanish on the back. `front example` is the English cue for the follow-up and `example` is the Spanish follow-up. The deck has `"frontLanguage": "en"` so the 🔊 button reads the Spanish answer.

### 3. Recognition cards (Vocabulary decks, `Coloquial-*`)

A Spanish expression on the front, with the English meaning, a Spanish example and a note on the back. These build understanding only. Any expression worth *using* should also get a dialogue card.

## Castilian rules (check every card)

1. **Pretérito perfecto for time that includes now**: *hoy, esta mañana, esta tarde, esta semana, este mes, este año, ya, todavía no, alguna vez, nunca*, and recent events with no time marker. «Hoy **he hecho** mucho», never «Hoy hice mucho».
2. **Indefinido for finished time**: *ayer, anoche, el lunes, la semana pasada, el mes pasado, en 2020, hace dos años*.
3. **quise ≠ quería.** *Quería / iba a* = I wanted / was going to (and didn't). *Quise* = I tried; *no quise* = I refused; *no quise decir eso* = I didn't mean that. «Te iba a llamar, pero se me hizo tarde», never «Quise llamarte, pero…».
4. **venir only means coming to where the speaker is now.** Got home → *llegué a casa*; came back → *volví*.
5. **Avoid English calques.**
   - Spanish uses a dative with an article where English uses a possessive: «**me** cambió **la** vida», not «cambió mi vida».
   - Accidental actions: «**me** dejé el portátil», «**se me** olvidó».
   - Collocations: *hacerse ilusiones / expectativas*, *meterle presión a alguien*, *tomar una decisión*.
6. **Spain vocabulary and forms:** *vosotros, vale, coger, el móvil, el ordenador / portátil, pronto* (= early), *quedar con*, *echar de menos*, *igual* (= maybe), *costes*.
   - Avoid Latin-American defaults: *ustedes* for friends, *extrañar, computadora, celular, manejar, acá, recién, platicar, costos*.
7. **Only real, established expressions.** Don't invent "modo X" phrases or literal translations. If unsure an idiom exists, use a plain alternative.
8. **Translate faithfully.** *cada vez más / menos* = more and more / less and less (not "every time"). The English cue must match the Spanish exactly — no extra or missing information.
9. **Exclamations take ¡!**: *¡Qué va!*, not *¿Qué va?* (the voice reads ¿? as a question).
10. **Grammar notes must be correct.** E.g. *hacer* is irregular in every person of the indefinido (*hice, hiciste, hizo…*), not only *yo*.

## Persian (`fa`) guidelines

- Use colloquial Tehrani Persian, the way people actually speak (*سرم خیلی شلوغه*, *وقت نکردم*), and match the situation, not the literal words.
- Prefer a real Persian idiom when one fits: *no me da la vida* = *وقت سر خاروندن ندارم*, *coger el tranquillo* = *کم‌کم داره دستم میاد*.
- Use the half-space (ZWNJ, U+200C) where Persian needs it: *می‌شه*, *کوچیک‌تر*, *بین‌التعطیلی*.

## Progress and IDs

A card's progress is keyed by a hash of its `front` + `back`. Decks and groups can be reordered, renamed or merged freely without losing progress. Editing a card's `front` or `back` gives it a new identity and resets its mark — intended, because the sentence to learn has changed. Editing `example`, `front example`, `translation`, `context` or `fa` keeps the mark.

## Roadmap

What to build next, in what order, and why, lives in [`ROADMAP.md`](../../ROADMAP.md). Every new layer must:
- name the roadmap layer it implements (e.g. W-3);
- follow the format and rules in this file;
- be 50 cards (5 groups of 10).

Update the roadmap's status table when a layer is built.
