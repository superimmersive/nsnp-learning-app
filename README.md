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

## Trial API

Phase 1 is a Postgres database with row-level security and a small Node API. The website and the Capacitor apps call the same API. Nothing here is deployed. GitHub Pages still serves lessons only.

The example schools are fictional (EMIS `90000001`–`90000012`). The two officials are Example Official One and Example Official Two. The super-admin is a placeholder named Devon Placeholder, with the fake number `+27000000000`.

### Run locally

Postgres 16 is required. Docker Compose brings up Postgres and the API:

```bash
docker compose up --build
```

Without Docker, create the roles `nsnp_migrator` (owner) and `nsnp_app` (no superuser, no bypass of row-level security), then:

```bash
cd api
cp .env.example .env
npm ci
npm run migrate
npm run seed
npm start
npm test
```

The API listens on port 8787. `GET /healthz` returns `{ "ok": true }`.

Leave `VITE_API_URL` unset to keep the clickable prototype on example data in the browser. To point the website at the API:

```bash
cd app
VITE_API_URL=http://127.0.0.1:8787 \
VITE_OFFICIAL_TOKEN=local-dev-official \
VITE_ADMIN_TOKEN=local-dev-admin \
npm run dev
```

`/join` then uses join codes, SMS codes, and approvals from the API. `/officials` loads the trial list from Postgres. A feeding count entered on This phone is kept in an outbox (`nsnp-trial-outbox-v1`) until Send now reaches the API. The same client id is sent again so a retry does not create a second count.

Demo codes after seeding: `DRY4K2` with `082 000 0091` (Dryveld), `OLD2K4` with `082 000 0099` (expired), staff code `DRYH9K` at Dryveld and `HANDL2` at Riverbend. With `SMS_PROVIDER=console` the API response includes the one-time code and the server prints it. No real SMS is sent.

### Environment variables

See `api/.env.example`. The important ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Migrator connection. Owns the tables. |
| `DATABASE_APP_URL` | API connection. Subject to row-level security. |
| `SMS_PROVIDER` | `console` (default), `local-sa`, or `twilio`. The last two are stubs. |
| `SMS_PEPPER`, `TOKEN_PEPPER`, `PIN_PEPPER` | Hash secrets. Local defaults are not for a shared environment. |
| `SEED_OFFICIAL_TOKEN`, `SEED_ADMIN_TOKEN` | Fixture bearer tokens created by the seed. |
| `VITE_API_URL` | Website build flag. Empty means the example-data prototype. |
| `VITE_OFFICIAL_TOKEN`, `VITE_ADMIN_TOKEN` | Tokens the dashboard sends when an API URL is set. |

Do not commit `.env`, API keys, or real cellphone numbers.

### Deploy runbook

This does not deploy anything. When Devon approves cost and an Azure subscription:

1. Build `infra/main.bicep` and read the template. `az bicep build --file infra/main.bicep` checks the file without creating resources.
2. Deploy only after a subscription and a cost approval exist, into a resource group in **South Africa North**: Postgres Flexible Server burstable **B1ms**, a Container Apps environment, and a Key Vault. Networking in the template is private.
3. Put `DATABASE_URL`, `DATABASE_APP_URL`, and the peppers in Key Vault. Point the container at the real API image (`apiImage`). Do not leave the placeholder image.
4. Run migrations and the school CSV import from a trusted machine. Do not load the fictional seed into production.
5. Set `SMS_PROVIDER` only after the gateway account exists. Until then the API must not be given real numbers.
6. The website build that talks to the API is separate from GitHub Pages. Pages stays lesson-only.

### What Devon still needs to supply

- Which SMS account to use (a local South African gateway or Twilio), and who pays for the messages.
- An Azure subscription and a yes on the South Africa North cost (Postgres B1ms plus a small container).
- The real Eden and Central Karoo school CSV (`school_number`, `name`, and, when available, `phase`, `quintile`, `enrolment`). Rows for any other district are rejected.
- The two officials' names and cellphone numbers, and whether they both see every trial school.
- The privacy notice contact (WCED information officer) and whether trial records are kept or deleted.
- A container registry and the first API image tag before the Bicep deploy is real.
