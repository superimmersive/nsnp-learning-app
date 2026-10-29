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

The Android and iOS apps below bundle every lesson and illustration, so they open with no network after install.

## Android and iOS

The native apps are the same Vite project inside a [Capacitor 8](https://capacitorjs.com/) shell. Capacitor copies `dist/` into an Android Studio project and an Xcode project, so the lessons, quizzes, and checklists stay in this folder. GitHub Pages still uses `npm run build` and the `BASE_PATH` set by `.github/workflows/pages.yml`.

`npm run build:native` is a separate Vite mode:

- The asset base is `/`, because the WebView serves the bundle from its own root. The Pages build keeps the repository subpath.
- Routing uses the URL hash (`/#/module/...`). Lesson links then resolve to files that are already in the app. The website keeps normal paths.
- The service worker is left out. Pages still generate `sw.js`, `404.html`, and `.nojekyll`.

| | |
| --- | --- |
| Display name | NSNP Learning |
| iOS bundle id and Android applicationId | `za.co.superimmersive.nsnp` |
| Version | 1.0.0 |
| Next Android `versionCode` | 2 (1 is already on Play internal testing) |
| Next iOS build | 2 (1.0.0 (1) is already on internal TestFlight) |

The native projects already live in `android/` and `ios/`. Do not recreate them. `npm run cap:sync` rebuilds the web bundle and copies it in. Those copies are gitignored, so run sync before every native build. Node.js 22 or newer and JDK 21 are required. iOS archives need a Mac with Xcode. No keystore, certificate, or API key belongs in this repo. Hand steps are in `../store/RELEASE.md`.

### Sync

```bash
npm ci
npm run cap:sync
```

### Signed Android App Bundle

Use the existing upload key. Do not run `keytool -genkeypair`. Copy `android/keystore.properties.example` to `android/keystore.properties` (gitignored) and set the passwords. `storeFile` is `/Users/devonk/keys/nsnp-upload.keystore` and `keyAlias` is `nsnp`. If that file is absent, Gradle falls back to `NSNP_STORE_FILE`, `NSNP_STORE_PASSWORD`, `NSNP_KEY_ALIAS`, and `NSNP_KEY_PASSWORD`.

```bash
npm run android:aab
```

The bundle is `android/app/build/outputs/bundle/release/app-release.aab`, versionCode 2, versionName 1.0.0. `npm run cap:open:android` opens the same project in Android Studio. JDK 21, same as the 18 Oct build.

### iOS archive for TestFlight

The bundle id `za.co.superimmersive.nsnp` is the existing App Store Connect app **NSNP Learning**. Build 1.0.0 (1) is already on internal TestFlight, so the project is now build 2. Team `U5DGDWXQCP` is set on the target with automatic signing. Do not create a second Xcode project.

```bash
cd ios
bundle install
bundle exec fastlane beta
```

Open `App.xcodeproj` (Swift packages, so there is no CocoaPods workspace). `npm run cap:open:ios` opens that project. Product → Archive uses the same scheme. The scene delegate and privacy manifest are already in the app target. See `../store/RELEASE.md`.

### Icon and splash

The mark is `assets/logo.svg` (navy `#0b2545`, gold `#e6c36a`, and the plate from the web icon). After you change it:

```bash
npm run assets:native
```

That redraws `assets/logo.png` and the Android and iOS icon and splash images.

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
