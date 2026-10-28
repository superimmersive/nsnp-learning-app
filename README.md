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

The free trial uses the Supabase project `nsnp-trial` (`ickpnerjcfpgxspvgdzo`) in **London (eu-west-2)** and can host the website on **Vercel Hobby**. Supabase has no South African region, so trial data is hosted in London. POPIA cross-border processing needs WCED's written OK before real names and cellphone numbers are stored. The schema is plain Postgres, so a dump can move it to a South African host later. An unused Azure template is kept in `infra/azure-later/`. GitHub Pages still serves lessons only and is not the trial host.

The example schools are fictional (EMIS `90000001`–`90000012`). The two officials are Example Official One and Example Official Two. The super-admin is a placeholder named Devon Placeholder, with the fake number `+27000000000`.

### How auth and row-level security fit

Sign-in is custom: a join code, a cellphone, an SMS code, then a device PIN. The Edge Function is deployed with `verify_jwt = false` (`supabase/config.toml`), so the Supabase gateway does not treat our session token as a Supabase JWT. The function checks the token itself.

The function connects with the auto-provided service role, and that role bypasses row-level security. It does not query tables directly. It calls `public.dispatch`, a `SECURITY DEFINER` function that loads the session, sets the `nsnp.*` settings, and only reads or writes rows `nsnp.can_read_school` allows. The same policies still apply to the `nsnp_app` role, which is what local tests and any direct SQL use. A super-admin call with an empty reason is rejected and, when a reason is present, an audit row is written first.

### Apply the database

Run these files in the Supabase SQL editor, or through the management connector, in this order. Each file stands alone.

1. `supabase/migrations/20261028100000_schema.sql`
2. `supabase/migrations/20261028100100_rls.sql`
3. `supabase/migrations/20261028100200_dispatch.sql`
4. `supabase/migrations/20261028100300_dispatch_ops.sql` (replaces `dispatch` with monthly packs, count corrections, issue close, number change, and device check-in)
5. `supabase/migrations/20261028100400_vault_and_config.sql` (Vault pepper and private settings)
6. `supabase/migrations/20261028100500_revoke_dispatch_from_api_roles.sql` (stop anon and authenticated calling `dispatch` and `session_secret`)
7. `supabase/migrations/20261028100600_advisor.sql` (search_path, foreign-key indexes, one staff-code select policy)
8. `supabase/seed.sql` (fictional schools only; not a migration)

### Edge Function

Deploy the folder `supabase/functions/api` (`index.ts`, relative imports, `deno.json`). Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. You do not need a secrets API. If `SESSION_SECRET` is unset, the function reads Vault through `public.session_secret()`, which only `service_role` can execute. The vault migration creates `nsnp_session_secret` with `gen_random_bytes` when that name is missing. The value never appears in git. If neither the environment nor Vault has it, the function returns 500 and does not sign anyone in.

`SMS_PROVIDER` and `DEV_FIXED_OTP` are not secrets. If the environment variable is blank, the function reads `private_config`. That table has row-level security on and no policies, so `anon` and `authenticated` cannot read it. The seed sets `DEV_FIXED_OTP` to `123456` for the trial-test setup only. Turn that off before a real user is added:

```sql
UPDATE private_config SET value = '' WHERE name = 'DEV_FIXED_OTP';
```

The browser calls the function with the public anon key in the `apikey` header. The function answers `OPTIONS` and allows `https://*.vercel.app`, `https://superimmersive.io`, and `https://*.superimmersive.io`. Vite bakes `VITE_SUPABASE_ANON_KEY` into the website at build time, so set it in the Vercel project before building. It is a public key. The function does not treat it as a login.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Provided on the function. Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Provided on the function. Used only inside the function to call `dispatch` and `session_secret`. |
| `SESSION_SECRET` | Optional. If unset, Vault name `nsnp_session_secret` is used. Hashes session tokens, SMS codes, and PINs. |
| `SMS_PROVIDER` | Optional. If unset, `private_config` is used, otherwise `console` logs the code. `local-sa` and `twilio` are stubs and do not send. |
| `DEV_FIXED_OTP` | Optional. If unset, `private_config` is used. The seed value `123456` is test-only. A blank value turns it off. |

The function URL is `https://ickpnerjcfpgxspvgdzo.supabase.co/functions/v1/api`.

### Website

Leave `VITE_API_URL` unset to keep example data in the browser. To call the function:

```bash
cd app
VITE_API_URL=https://ickpnerjcfpgxspvgdzo.supabase.co/functions/v1/api \
VITE_SUPABASE_ANON_KEY=the-public-anon-key \
npm run dev
```

`/officials` asks for a cellphone, the SMS code, then a PIN on this device. The dashboard nav is shown for a `district_official` or `super_admin` session. There is no baked official token. `app/vercel.json` rewrites unknown paths to `index.html` so `/officials` and `/join` work on Vercel Hobby. Set the Vercel project root to `app`. Add the same `VITE_*` values in the Vercel project settings. The anon key is public; it only gets the request through the Supabase gateway. The function does not treat it as a user login.

Demo codes after the seed: `DRY4K2` with `082 000 0091`, expired `OLD2K4` with `082 000 0099`, staff codes `HANDL2` and `DRYH9K`. Feeding counts wait in `nsnp-trial-outbox-v1` until Send now. `POST /v1/me/certificate` issues one learning record after all 11 modules are passed.

### Run the tests locally

Postgres 16, then:

```bash
cd api
cp .env.example .env
npm ci
npm test
```

`npm test` applies `supabase/migrations`, loads `supabase/seed.sql`, and checks row-level security, join codes, the 7-day PIN lock, certificates, monthly packs, count corrections, issue close, number change, device check-in, the private config lock, and Edge Function route matching. Docker Compose still starts a local Postgres and the Node API for the same schema.

### Free-plan limits

The Supabase free plan pauses the project after about a week without activity, stores 500 MB, and caps Edge Function invocations. A weekly request to `GET /functions/v1/api/healthz` is enough to keep it awake. Do not put real personal information in this project until WCED has agreed in writing.

### What Devon still needs to supply

- Written acceptance that trial data may sit in London, or a decision to move the dump to a South African host before real data.
- Which SMS account to use, if any. Until then leave `SMS_PROVIDER` unset so codes are only logged.
- The real school CSV, the two officials' names and numbers, and whether both see every school.
- The Vercel project and the public Supabase anon key for the website build.
- The privacy notice contact, and whether trial records are kept or deleted.
