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

## Android and iOS apps

The same lessons also install as **NSNP Learning** (`za.co.superimmersive.nsnp`). [Capacitor](https://capacitorjs.com/) wraps this project. Quizzes, checklists, and the certificate name still stay in `localStorage` on that device (`nsnp-learning-progress-v1`). The website and the installed app do not share that progress. There is no login and no server.

The installed app contains every lesson, so it opens with no signal. The browser service worker is only registered on the website. Inside the app the files are already on the device.

GitHub Pages is unchanged. `npm run build` still follows `BASE_PATH` (Pages sets `/nsnp-learning-app/`). `npm run build:native` forces the site root (`/`) so images and routes resolve inside the app. Do not point the Pages workflow at the native script.

Icons and the splash screen use the same mark as `public/favicon.svg`. The source files are in `assets/`. After you change them, run `npm run assets:native`.

### What you need

- Node.js 22 or newer.
- Android: Android Studio Otter (2025.2.1) or newer, JDK 21, and Android SDK 36. Set `ANDROID_HOME` to the SDK directory.
- iOS: a Mac with Xcode 16 or newer. This project uses Swift Package Manager (iOS 15 and later). CocoaPods is not required.

### Copy the web build into the native projects

```bash
npm install
npm run cap:sync
```

That builds with a root base path, then copies `dist/` into `android/` and `ios/`.

### Android APK

A debug APK installs without Play Console. On the phone, allow installs from unknown apps, or use a USB cable with USB debugging on.

```bash
npm run android:apk
```

The file is `android/app/build/outputs/apk/debug/app-debug.apk`.

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

To use Android Studio instead:

```bash
npm run android:open
```

Then **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

### Android App Bundle for Play Console

```bash
npm run android:aab
```

That writes an **unsigned** release bundle to `android/app/build/outputs/bundle/release/app-release.aab`. Play Console will not accept it until it is signed.

Before the first Play upload, Devon needs:

1. A Google Play Console account for the organisation.
2. An upload keystore, created once and stored outside this repo. Do not commit a `.jks` or `.keystore`.
3. A signed bundle. In Android Studio use **Build → Generate Signed App Bundle**, choose the upload key, and upload the `.aab`. Turn on Play App Signing so Google holds the app signing key. The application id is `za.co.superimmersive.nsnp`.
4. A store listing, content rating, and privacy policy. The app keeps the person's name, school, and role on the device only. It does not send them anywhere.
5. A higher `versionCode` in `android/app/build.gradle` for every upload after the first.

### iOS with Xcode and TestFlight

The iOS app has to be built on a Mac. This repository cannot produce an `.ipa` on Linux.

```bash
npm install
npm run cap:sync
npm run ios:open
```

In Xcode:

1. Select the **App** target. Under **Signing & Capabilities**, choose the Superimmersive Apple Developer team. The bundle id is `za.co.superimmersive.nsnp`.
2. Let Xcode resolve the Swift package the first time it opens (`capacitor-swift-pm`).
3. For a phone on the desk, pick that iPhone and press **Run**.
4. For TestFlight, choose **Any iOS Device (arm64)**, then **Product → Archive**, then **Distribute App → App Store Connect**.
5. In App Store Connect, create the app with that bundle id if it is not there yet, and add the build to TestFlight.

Devon needs an Apple Developer Program membership for the organisation, App Store Connect access, and a signing certificate. Xcode creates the certificate and provisioning profile when the Apple ID is signed in and the team is selected. `Info.plist` sets `ITSAppUsesNonExemptEncryption` to false because the app does not add its own encryption beyond ordinary HTTPS.

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
