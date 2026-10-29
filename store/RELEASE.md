# NSNP Learning — release handover

This is the hand path for the next store upload. It does not publish anything.

The native projects in `app/android` and `app/ios` are the ones already used for the stores. Do not run `npx cap add`. Do not replace the icons or splash screens. Do not create a second Play app or a second App Store Connect app. Do not generate a new Android upload key.

## Assumptions

Devon is collecting how iOS **1.0.0 (1)** and Android **1 (1.0.0)** were built on 18 Oct 2026. Those notes are not in this repo yet. Until they arrive, this file assumes the following. If a note contradicts an assumption, the note wins and the matching change here should be reverted.

1. The `app/ios` and `app/android` trees in git are the projects that produced those builds. This change only bumps versions, records the Apple team on the existing iOS target, adds a privacy manifest, and tightens release signing so the next AAB must match the existing upload certificate.
2. iOS 1.0.0 (1) was archived from `app/ios/App/App.xcodeproj`, scheme `App`, automatic signing, team `U5DGDWXQCP`. That team was not previously stored in the project file. It is now on the Debug and Release target. If build 1 used another team or a manual profile, remove `DEVELOPMENT_TEAM` and sign the way build 1 was signed.
3. `SceneDelegate.swift`, `UIApplicationSceneManifest` in `Info.plist`, and `Main.storyboard` were already in the project and match the Capacitor 8.5 scene template. They were not rewritten. Assumption: that is what the Xcode 27 / iOS 27 SDK requires at launch. Build 1 may have been compiled with an older SDK that did not enforce scenes yet.
4. Android 1 (1.0.0) was `bundleRelease` with JDK 21 on the Mac, application id `za.co.superimmersive.nsnp`, `targetSdk` 36, `versionCode` 1. Release 2 keeps that toolchain and uses `versionCode` 2 and `versionName` 1.0.0.
5. That AAB was signed with alias `nsnp` at `/Users/devonk/keys/nsnp-upload.keystore`. Upload certificate SHA-1 is `69:D4:67:3D:AA:1B:F6:71:C5:A1:E7:65:FE:FA:D5:B7:B8:BA:9E:CA`. Passwords live only in untracked `app/android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). If that file has no `storeFile`, Gradle uses `NSNP_STORE_FILE`, `NSNP_STORE_PASSWORD`, `NSNP_KEY_ALIAS`, and `NSNP_KEY_PASSWORD`. Assumption: build 1 used one of those two, not a keystore in git.
6. No new upload key is created here. Play will reject an AAB signed with any other certificate unless an upload-key reset has been approved.
7. The iOS App Store icon already in the project is 1024×1024, RGB, no alpha. Android launcher and splash images were left as they are. Assumption: they passed review for build 1 and still meet the store rules.
8. Play app id `4973108586448023958` and App Store Connect app Apple ID `6824168888`, SKU `nsnp-learning-ios`, already exist.
9. The Play account is an **organisation** account and already has an internal testing release, so the 12-tester closed-test wait for new personal accounts does not apply.
10. The Apple seller is still an individual account in Devon Kirchner’s name. A conversion to the company is pending. Public listing text does not name a seller.
11. Store binaries are `npm run build:native` (Vite mode `native`): lessons only, no trial API. Assumption: build 1 was made that way. This change keeps the website trial routes out of that mode.
12. The privacy URL `https://superimmersive.io/nsnp-learning-app/privacy` works only after this web route is deployed. No monitored email address was in the repo. Play’s contact email is whatever is already on the developer account.
13. The App Store Connect API key id to use at upload time is `S78XAXRG43`. The issuer id and the `.p8` file were not in the repo and must be supplied through the environment. They were not committed.
14. The exact `xcodebuild` flags, export options, and Gradle command from 18 Oct were not available. `store/RELEASE.md` and fastlane are the path for the next build, not a claim that they reproduce the 18 Oct command line byte for byte.
15. `android:allowBackup` stays `true`, as in the existing manifest. The store build still does not send lesson data to Superimmersive. A phone with Android backup on may copy on-device progress into that user’s own Google backup.
16. The GitHub Actions workflows are manual and were not run here. The iOS one is optional. The Mac, with Xcode signed into team `U5DGDWXQCP`, is the path that can actually upload.

## What is already true

| | iOS | Android |
| --- | --- | --- |
| Store name | NSNP Learning | NSNP Learning |
| Id | `za.co.superimmersive.nsnp` | `za.co.superimmersive.nsnp` |
| Record | Apple ID `6824168888`, SKU `nsnp-learning-ios` | Play app `4973108586448023958` |
| Already shipped | TestFlight internal 1.0.0 (1) | Internal testing 1 (1.0.0), 18 Oct 2026 |
| Next upload | 1.0.0 (2) | versionCode 2, versionName 1.0.0 |
| Signing | Automatic, team `U5DGDWXQCP` | Existing upload key, alias `nsnp` |

`Info.plist` already has the display name **NSNP Learning**, `ITSAppUsesNonExemptEncryption` = false, a launch storyboard, and no camera, photo, location, microphone, or tracking usage strings. Leave those strings out. The app does not use those permissions.

## Android — build versionCode 2 on the Mac

JDK 21, Node 22, from `app/`:

1. Confirm the keystore is still `/Users/devonk/keys/nsnp-upload.keystore`.
2. Copy `android/keystore.properties.example` to `android/keystore.properties`. Set `storePassword` and `keyPassword`. Leave `storeFile` and `keyAlias` as in the example. Do not commit that file.
3. Check the certificate before signing. `keytool` will prompt for the store password. The SHA-1 line must be the one above.

   ```bash
   keytool -list -v -keystore /Users/devonk/keys/nsnp-upload.keystore -alias nsnp
   ```

4. Build:

   ```bash
   npm ci
   npm run android:aab
   ```

   `android:aab` runs `build:native`, syncs web assets into the existing Android project, and runs `bundleRelease`. Gradle refuses `versionCode` below 2, any alias other than `nsnp`, and any certificate with a different SHA-1.

5. The file to upload is `android/app/build/outputs/bundle/release/app-release.aab`.

An AAB built on a machine that does not have this keystore is unsigned. Play will reject it. Do not upload a proof build from CI logs or from another computer.

### Upload by hand

The app record already exists. Do not press **Create app** again.

1. Play Console → **NSNP Learning**.
2. **Test and release** → **Internal testing**.
3. **Create new release**.
4. Upload the versionCode 2 AAB signed with the key above. Play App Signing stays on. The upload key must match the certificate already registered from the 18 Oct AAB.
5. Release name can be `1.0.0 (2)`. Release notes: short note that this is the lesson app, with no login.
6. Save, review, and roll out to internal testing. Install that build on a phone before production.
7. When internal testing looks right, **Promote release** to production. Production is a separate rollout. Do not do it in the same sitting as the first internal upload of versionCode 2 unless the internal build has been installed.

If the Mac keystore is actually lost, stop. Play Console → **App integrity** → **App signing** → request an upload key reset. Only after Google accepts the reset may a new key be created. Until then, every upload must use the SHA-1 above.

### Lost-key reset is not the plan

The key is on the Mac at the path above. This repo does not contain a script that generates a replacement.

### GitHub Actions (optional)

`.github/workflows/android-aab.yml` is manual. It does not set secrets. Add these repository secrets yourself, using the **existing** keystore:

| Secret | What it is |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64` of `/Users/devonk/keys/nsnp-upload.keystore` (one line, no password in the name) |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` |
| `ANDROID_KEY_ALIAS` | `nsnp` |
| `ANDROID_KEY_PASSWORD` | `keyPassword` |

The workflow passes them as `NSNP_*` environment variables. Gradle still checks the SHA-1. A new keystore in that secret fails the build.

Base64 on the Mac: `base64 -i /Users/devonk/keys/nsnp-upload.keystore | pbcopy`

## iOS — build 2 from the Mac

The project already uses a scene lifecycle: `UIApplicationSceneManifest` points at `SceneDelegate`, and `SceneDelegate` builds the Capacitor window and forwards URLs to `SceneDelegateProxy`. An archive made with the Xcode 27 / iOS 27 SDK needs that. Do not remove it, and do not replace it with a fresh `cap add ios`.

`PrivacyInfo.xcprivacy` is in the app target. It declares no tracking and no collected data types. Capacitor ships its own manifest inside the Swift package. After the first archive of build 2, open the privacy report in the Organizer and confirm it still says the app does not track.

1. On the Mac, Xcode signed in to team `U5DGDWXQCP`.
2. From `app/ios`:

   ```bash
   cd app
   npm ci
   cd ios
   bundle install
   export ASC_KEY_ID=S78XAXRG43
   export ASC_ISSUER_ID='the-issuer-uuid'
   export ASC_KEY_PATH="$HOME/keys/AuthKey_S78XAXRG43.p8"
   export IOS_BUILD_NUMBER=2
   export IOS_VERSION=1.0.0
   bundle exec fastlane beta
   ```

   `ASC_KEY_CONTENT` may be used instead of `ASC_KEY_PATH` (the PEM text). `ASC_KEY_CONTENT_BASE64=true` if that value is base64. Fastlane refuses a build number below 2.

3. `fastlane archive` only makes the ipa. `fastlane beta` uploads to TestFlight and does not submit the app for review.
4. Or skip fastlane: `npm run cap:sync` from `app/`, open `ios/App/App.xcodeproj`, Product → Archive, then Distribute → App Store Connect. The target’s build number is already 2.
5. In App Store Connect, wait until build 2 finishes processing. Add it to the internal TestFlight group. Install it before you submit for review.
6. Submitting for review is separate: fill the listing from `store/app-store/listing.md`, privacy from `store/app-store/privacy.md`, attach build 2, and submit. This repo does not do that step.

### Optional GitHub Actions

`.github/workflows/ios-testflight.yml` is manual and untested. A hosted Mac does not have the signing keychain from 18 Oct, so it also needs:

| Secret | What it is |
| --- | --- |
| `ASC_KEY_ID` | `S78XAXRG43` |
| `ASC_ISSUER_ID` | Issuer id from App Store Connect → Users and Access → Integrations |
| `ASC_KEY_CONTENT` | Contents of the `.p8` file |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Distribution `.p12` from the Mac keychain |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Password for that `.p12` |

If those certificate secrets are not handy, use the Mac steps above and ignore this workflow.

## Play Console — finish setup, then release

None of the **Set up your app** tasks are done. Draft answers are in `store/play/console-answers.md`. Listing text is in `store/play/listing.md`. Graphics are in `store/graphics` and `store/screenshots`.

Do these before production. Internal testing can proceed once the AAB uploads, but production stays blocked until the dashboard tasks are complete.

Order that matches the dashboard:

1. Privacy policy URL, after the page is deployed.
2. App access: all functions available, no login. Paste the reviewer note from the answers file.
3. Ads: no.
4. Content rating: submit the questionnaire from the answers file.
5. Target audience: 18 and over.
6. Data safety: no data collected or shared.
7. Government apps: no.
8. Financial features: no.
9. Health: no.
10. Category **Education**, contact details, and the store listing (text plus screenshots, 512 icon, 1024×500 feature graphic).

### Personal accounts and closed testing

A **personal** Play developer account created after November 2023 must run a closed test with at least 12 testers opted in for 14 continuous days before production. An **organisation** account does not have that requirement.

This account is an organisation account, and internal testing for versionCode 1 is already active. The next step is internal testing of versionCode 2, then production. Do not open a closed test just to satisfy the personal-account rule, and do not create a new app to start that clock.

## App Store Connect — listing, then review

Listing text: `store/app-store/listing.md`. Privacy answers: `store/app-store/privacy.md`.

1. The app record exists. Do not press **New App**.
2. Attach build 2 after TestFlight processing.
3. Paste the listing. Leave the seller line as the account shows it today (individual). Do not write the company name into the description while the conversion is pending.
4. App Privacy: Data Not Collected. No tracking.
5. Age rating: follow the questionnaire. This is staff training, not a children’s app.
6. Submit for review only when the privacy URL loads in a browser.

## Deploy the privacy page first

The page is the web route `/privacy`. On the site that uses base path `/nsnp-learning-app`, the public URL is:

`https://superimmersive.io/nsnp-learning-app/privacy`

Open it after deploy before pasting it into either store. The store apps also contain the same page for someone who taps Privacy on the home screen. The store builds still have no account.

## Screenshots

Taken from the running lesson UI, not from a redesigned frame. Sizes:

| Set | Pixels | Where to upload |
| --- | --- | --- |
| `store/screenshots/ios-6.7` | 1290×2796 | iPhone 6.7" |
| `store/screenshots/ios-6.5` | 1242×2688 | iPhone 6.5" |
| `store/screenshots/ipad-13` | 2064×2752 | iPad 13" (the app target includes iPad) |
| `store/screenshots/play-phone` | 1080×2160 | Play phone |
| `store/graphics/play-icon-512.png` | 512×512 | Play high-res icon |
| `store/graphics/play-feature-1024x500.png` | 1024×500 | Play feature graphic |

The iOS 1024 icon and the Android launcher icons in the native projects were not replaced. The Play 512 icon in `store/graphics` is a listing image made from the same logo, for the store form only.

Regenerate screenshots with `store/capture-screenshots.mjs` while `npm run dev` is running in `app/`.
