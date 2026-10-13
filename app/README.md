# NSNP Learning

Mobile-first lessons for the Western Cape Education Department **National School Nutrition Programme (NSNP) 2026 roadshow**. Written for School Management Teams in the **Eden and Central Karoo Education District**.

Presenters: L. Sampo and L. Steyn.

The people using it are principals, SMT members, school NSNP coordinators, and food handlers, often on a basic Android phone. The app is a static site. There is no login and no server to configure. Progress, checklist ticks, and the certificate name stay in the browser (`localStorage`).

Built for Superimmersive.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

Vite also prints a network address. Use that on a phone that is on the same Wi-Fi.

## Tests

```bash
npm test
```

## Use it offline

The dev server needs a connection. To install the app on a phone:

```bash
npm run build
npm run preview
```

Open the preview, then in Chrome choose **Add to Home screen**. The build caches its pages, so a later visit can open when the signal is weak. Lessons you have not opened yet still need one successful load first.

## Edit the lessons

All training text, quiz questions, checklists, deadlines, honorarium amounts, and the meal-estimate figures are in one file:

`src/data/content.en.json`

Change the words, keep the `id` values the same, and refresh the browser. Quiz `answer` is the position of the correct option, starting at 0.

### Afrikaans and isiXhosa

The file is English (`locale` is `en`). Afrikaans (`af`) and isiXhosa (`xh`) are planned, not loaded yet.

1. Copy `src/data/content.en.json` to `src/data/content.af.json` or `src/data/content.xh.json`.
2. Translate the strings. Do not change ids, quiz answer numbers, times, or rand amounts.
3. Point `src/lib/content.ts` at the new file when that translation is ready.

Have a person who knows the WCED wording check the gas-safety steps and the money tables. Do not publish a machine translation of those on its own.

## What is in the app

- 11 modules. Each one has short lesson cards, a key-rules box, and a 5-question quiz with feedback.
- Checklists for the preparation area, deliveries and storage, and the monthly forms.
- A deadlines and times page (08:00, 12:30, 13:30, and the 7th).
- A meal-quantity estimate scaled from the roadshow example of 500 secondary learners.
- An April 2026 honorarium lookup, inside the volunteer food handler module.
- A certificate you can print or save after all 11 quizzes are passed (80%, which is 4 out of 5).

## The official calculator still wins

Quantities in this app are an **estimate** from the roadshow example. Before you order or cook, use the official **WCED daily meal preparation quantity calculator**. This app is a learning aid. It is not a WCED circular. If a rule changes, update the JSON.
