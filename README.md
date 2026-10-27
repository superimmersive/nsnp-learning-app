# NSNP Learning App

Web app that digitises the National School Nutrition Programme (NSNP) roadshow
presentation for School Management Teams (Eden and Central Karoo Education District).

## Goal
Turn the 47-slide training deck into an interactive, mobile-friendly learning app:
short modules, quizzes, checklists and printable forms.

## Proposed modules
1. What is the NSNP and who's who
2. Preparation area: required documents and posters
3. Volunteer Food Handlers: appointment, duties, honoraria, UIF
4. NSNP Committee: roles (principal, SMT, SGB, food handler, coordinator, RCL)
5. Monthly forms: feeding register, stock form, proof of payment (due by the 7th)
6. Menu, measurements and feeding times
7. Feeding with dignity and sample (ghost) plates
8. Food safety and hygiene
9. Deliveries and food storage (FIFO)
10. PPE, first aid, fire and gas safety
11. Daily feeding statistics (before 13:30)

## Folders
- `reference/` original PDF and slide previews (`slides/`)
- `content/` extracted text and module scripts
- `app/` web app source, plus the Capacitor `android/` and `ios/` projects

## Android and iOS

The website and the native apps are the same Vite + React code. [Capacitor 8](https://capacitorjs.com/) wraps a native build of `app/dist` in Android Studio and Xcode projects. GitHub Pages is unchanged: `.github/workflows/pages.yml` still runs `npm run build` with the Pages subpath.

Native builds use `npm run build:native` (`vite build --mode native`):

- Asset base `/` inside the WebView. The Pages build keeps `BASE_PATH`.
- Hash routes (`/#/module/...`) so lessons open offline from files packed in the app. The website keeps normal URLs.
- No service worker in the apps. Every lesson and illustration is in the binary.

Display name **NSNP Learning**. iOS bundle id and Android `applicationId` are `za.co.superimmersive.nsnp`. Version **1.0.0**, build **1**.

From `app/` (Node.js 22+, JDK 21; iOS needs a Mac with Xcode 26+):

```bash
npm ci
npm run cap:sync
```

`cap:sync` rebuilds the web bundle and copies it into `android/` and `ios/`. Those copies are gitignored. Do not commit keystores, `keystore.properties`, certificates, provisioning profiles, or API keys.

### Signed Android App Bundle

```bash
mkdir -p "$HOME/keys"
keytool -genkeypair -v \
  -keystore "$HOME/keys/nsnp-upload.keystore" \
  -alias nsnp \
  -keyalg RSA -keysize 2048 -validity 10000

export NSNP_STORE_FILE="$HOME/keys/nsnp-upload.keystore"
export NSNP_STORE_PASSWORD='your-store-password'
export NSNP_KEY_ALIAS=nsnp
export NSNP_KEY_PASSWORD='your-key-password'

cd app
npm run cap:sync
cd android
./gradlew bundleRelease
```

Upload `app/android/app/build/outputs/bundle/release/app-release.aab`. The same values can live in `app/android/keystore.properties` (see `keystore.properties.example`), which is gitignored.

### iOS archive for TestFlight

The bundle id matches the App Store Connect app **NSNP Learning**. On the Mac:

```bash
cd app
npm ci
npm run cap:sync
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$HOME/nsnp/NSNP-Learning.xcarchive" \
  DEVELOPMENT_TEAM=YOUR_TEAM_ID \
  archive
```

Open `App.xcodeproj` (Swift Package Manager, not CocoaPods). Then in Xcode: Window → Organizer → Distribute App → App Store Connect → Upload. `npm run cap:open:ios` opens the same project.

The icon source is `app/assets/logo.svg`. Regenerate with `npm run assets:native`. More detail is in `app/README.md`.
