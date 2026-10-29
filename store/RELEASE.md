# NSNP Learning — release handover

Checked against the 29 Oct 2026 handover of the 18 Oct store builds. This file does not publish anything, and it does not restore or recreate the App Store Connect app.

The native projects in `app/android` and `app/ios` are the ones already used. Do not run `npx cap add`. Do not replace the committed icons or splash screens (`npm run assets:native` already generated them from `app/assets/logo.svg`). Do not generate a new Android upload key. Do not add a second signing scheme or a second archive tool.

## What those builds were

| | iOS | Android |
| --- | --- | --- |
| Built | 18 Oct 2026, branch `cursor/native-capacitor-apps-1230` @ `b9960ff` | 18 Oct 2026, uploaded through the Play website |
| Project | `app/ios/App/App.xcodeproj`, scheme `App`, Capacitor 8 | `app/android`, Gradle 8.14.3, JDK 21 |
| Id | `za.co.superimmersive.nsnp` | `za.co.superimmersive.nsnp` |
| Version | Marketing 1.0.0, builds **1** and **2** uploaded | Internal testing **1 (1.0.0)**, versionCode **1** |
| Next number | `CURRENT_PROJECT_VERSION` **3** | versionCode **2**, versionName 1.0.0 |
| Signing | Automatic, team `U5DGDWXQCP` | Existing upload key, alias `nsnp` |

Upload certificate SHA-1: `69:D4:67:3D:AA:1B:F6:71:C5:A1:E7:65:FE:FA:D5:B7:B8:BA:9E:CA`. Keystore on the Mac: `/Users/devonk/keys/nsnp-upload.keystore`.

Play app id `4973108586448023958` is still there. The account is an organisation, so the 12-tester closed test for new personal accounts does not apply.

## App Store Connect record is gone

Apple ID `6824168888`, SKU `nsnp-learning-ios`, is not on the API anymore (404, no builds). The bundle id is still registered in the developer portal as **NSNP Learning**, resource `QJ9366RHH2`, with no capabilities and no profiles. It was probably removed.

Do this yourself before the next upload. This repo does not do it.

1. App Store Connect → Apps → the status menu or Removed Apps. Look for **NSNP Learning**.
2. If it is there, **restore** it. Restoring keeps the old record.
3. If it is not there, create the app again with the bundle id that is already registered (`za.co.superimmersive.nsnp`, name NSNP Learning). Use SKU `nsnp-learning-ios` only if App Store Connect accepts it again. A new record gets a new Apple ID.
4. Do not register a second bundle id. Do not add capabilities. The portal entry has none.
5. Do not accept Apple agreements from this step. `BETA_CONTRACT_MISSING` blocks external TestFlight review. Leave the agreements as they are. Internal TestFlight does not need that contract.

Internal testers must be App Store Connect users. `dkdevongray@gmail.com` (Account Holder) works. `devon@superimmersive.io` was rejected.

## Android — versionCode 2

Signing is the existing mechanism. `NSNP_STORE_FILE`, `NSNP_STORE_PASSWORD`, `NSNP_KEY_ALIAS`, and `NSNP_KEY_PASSWORD` win when they are set. Otherwise Gradle reads `storeFile`, `storePassword`, `keyAlias`, and `keyPassword` from `app/android/keystore.properties` (gitignored). There is no second set of variable names and no script that makes a new keystore.

JDK 21, from `app/`, the same command as 18 Oct, with versionCode 2 already in `android/app/build.gradle`:

```bash
cd app
npm run cap:sync
cd android
export JAVA_HOME=<jdk21>
export NSNP_STORE_FILE="$HOME/keys/nsnp-upload.keystore"
export NSNP_KEY_ALIAS=nsnp
export NSNP_STORE_PASSWORD='...'
export NSNP_KEY_PASSWORD='...'
./gradlew bundleRelease
```

`npm run android:aab` from `app/` is that sync plus `bundleRelease`. Gradle still refuses versionCode below 2, an alias other than `nsnp`, and a certificate with a different SHA-1.

Check the key before you upload. `keytool` prompts for the store password:

```bash
keytool -list -v -keystore "$HOME/keys/nsnp-upload.keystore" -alias nsnp
```

The AAB is `app/android/app/build/outputs/bundle/release/app-release.aab`. An unsigned AAB from a machine without this keystore must not be uploaded.

### Upload by hand

The Play app already exists. Do not press **Create app**.

1. Play Console → **NSNP Learning**.
2. **Test and release** → **Internal testing** → **Create new release**.
3. Upload the versionCode 2 AAB signed with the key above. Play App Signing stays on. The upload certificate must match the 18 Oct one.
4. Roll out to internal testing and install it before production.
5. Promote to production only after that install. Finish the dashboard tasks first. **Target audience** and **Data safety** stay blocked until **App access** is saved.

If the keystore is lost, stop. Play Console → **App integrity** → **App signing** → request an upload key reset. Only after Google accepts it may a new key be created.

### GitHub Actions

`.github/workflows/android-aab.yml` is manual. It maps these secrets onto the existing `NSNP_*` variables. Put the **existing** keystore in the secret, not a new one.

| Secret | Maps to |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | decoded file, then `NSNP_STORE_FILE` |
| `ANDROID_KEYSTORE_PASSWORD` | `NSNP_STORE_PASSWORD` |
| `ANDROID_KEY_ALIAS` | `NSNP_KEY_ALIAS` (`nsnp`) |
| `ANDROID_KEY_PASSWORD` | `NSNP_KEY_PASSWORD` |

On the Mac: `base64 -i "$HOME/keys/nsnp-upload.keystore" | pbcopy`

## iOS — build 3

Scene support is already in the project (`SceneDelegate.swift` and `UIApplicationSceneManifest`). Leave it. An archive made with the Xcode 27 / iOS 27 SDK will not launch without it. `PrivacyInfo.xcprivacy` is the only new file in the app target.

The 18 Oct upload did not use fastlane or altool. Repeat that flow. Builds 1 and 2 were already uploaded, so this one is build **3** even though the app record is currently gone. Restore or recreate the record first, or the upload has nowhere to land.

From `app/` on the Mac, after `npm run cap:sync`:

```bash
cd app/ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$HOME/builds/nsnp/NSNP-b3.xcarchive" \
  DEVELOPMENT_TEAM=U5DGDWXQCP \
  CODE_SIGN_STYLE=Automatic \
  CURRENT_PROJECT_VERSION=3 \
  MARKETING_VERSION=1.0.0 \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$HOME/keys/AuthKey_S78XAXRG43.p8" \
  -authenticationKeyID S78XAXRG43 \
  -authenticationKeyIssuerID '<issuer>' \
  archive

xcodebuild -exportArchive \
  -archivePath "$HOME/builds/nsnp/NSNP-b3.xcarchive" \
  -exportPath "$HOME/builds/nsnp/export" \
  -exportOptionsPlist "$HOME/builds/nsnp/ExportOptions.plist" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$HOME/keys/AuthKey_S78XAXRG43.p8" \
  -authenticationKeyID S78XAXRG43 \
  -authenticationKeyIssuerID '<issuer>'
```

`~/builds/nsnp/ExportOptions.plist` is the existing one: method `app-store-connect`, destination `upload`, signing style automatic, `manageAppVersionAndBuildNumber` false. Do not commit another copy. The project file’s build number is already 3, and the archive command sets it again.

The `.p8` and the issuer id stay on the Mac. Key id `S78XAXRG43`. Do not commit the key.

After processing, add the build to internal TestFlight and invite `dkdevongray@gmail.com`. Do not start an external beta while `BETA_CONTRACT_MISSING` is in the way, and do not accept the agreement to clear it.

### Optional GitHub Actions

`.github/workflows/ios-testflight.yml` runs the same `xcodebuild archive` and `xcodebuild -exportArchive` steps. It writes a temporary ExportOptions plist with those same keys because the runner cannot see `~/builds/nsnp/ExportOptions.plist`. Secrets:

| Secret | What it is |
| --- | --- |
| `ASC_KEY_ID` | `S78XAXRG43` |
| `ASC_ISSUER_ID` | Issuer id from App Store Connect → Users and Access → Integrations |
| `ASC_KEY_CONTENT` | Contents of `AuthKey_S78XAXRG43.p8` |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Distribution `.p12` from the Mac keychain. The 18 Oct Mac does not need this. A GitHub runner does. |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Password for that `.p12` |

The Mac commands above are the path that matches 18 Oct. This workflow has not been run.

## Play Console tasks

None of **Set up your app** are done. Answers are in `store/play/console-answers.md`. Listing text is in `store/play/listing.md`.

Do **App access** before target audience and data safety. Those two stay blocked until App access is filled in. Play also asks which store assets were made with AI. The phone screenshots are captures of the running lesson UI. The 512 icon is a render of `app/assets/logo.svg`. The feature graphic is that logo plus one of those screenshots. Say that if the question is about the store images. The lesson illustrations inside the screenshots are the pictures already in the app.

Order:

1. Privacy policy URL, after the page is deployed.
2. App access: all functions available, no login.
3. Ads: no.
4. Content rating.
5. Target audience: 18 and over.
6. Data safety: no data collected or shared.
7. Government apps: no.
8. Financial features: no.
9. Health: no.
10. Category **Education**, contact details, store listing, and the AI-assets answer.

A personal Play account created after November 2023 must run a closed test with 12 testers for 14 days before production. This account is an organisation and already has internal testing. Upload versionCode 2 to internal testing, then production. Do not open a closed test to satisfy the personal-account rule.

## App Store listing

Text: `store/app-store/listing.md`. Privacy: `store/app-store/privacy.md`.

The seller on a restored or recreated record may still be the individual account. Do not write a company name into the description while a conversion to the company is pending. Do not accept agreements as part of filling the listing.

Attach **1.0.0 (3)** after it processes. Submit for review only when the privacy URL loads.

## Privacy URL

`https://superimmersive.io/nsnp-learning-app/privacy`

That route is in this branch. It is not on the public site until the site is deployed. Open it in a browser before pasting it into either store.

## Screenshots

Taken from the running lesson UI. The native icon and splash files were not replaced.

| Set | Pixels |
| --- | --- |
| `store/screenshots/ios-6.7` | 1290×2796 |
| `store/screenshots/ios-6.5` | 1242×2688 |
| `store/screenshots/ipad-13` | 2064×2752 |
| `store/screenshots/play-phone` | 1080×2160 |
| `store/graphics/play-icon-512.png` | 512×512 |
| `store/graphics/play-feature-1024x500.png` | 1024×500 |

Regenerate with `node store/capture-screenshots.mjs` while `npm run dev` is running in `app/`. On the Mac, `zsh` stops a command when a glob matches nothing, and `rg` is not installed. Use `grep` there.
