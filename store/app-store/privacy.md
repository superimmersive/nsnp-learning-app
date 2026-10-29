# App Privacy nutrition label — store build

Answer this for the binary that goes to the App Store, not for the website trial.

## Tracking

No. The app does not track. It does not link data with third-party ads, and it does not share data with a data broker. There is no `NSUserTrackingUsageDescription`.

## Data collection

**Data Not Collected.**

The store build does not send data off the device. Quiz scores, checklist ticks, and the optional name, school, and role for the learning record stay in on-device storage. There is no account, no analytics SDK, and no crash reporter.

Do not declare Contact Info, Identifiers, Usage Data, or Diagnostics.

If a later store build adds the website trial (name, cellphone, school role sent to a server), stop and fill a new label before that version is submitted. This label is only true while the binary stays lesson-only.

## Privacy manifest

`app/ios/App/App/PrivacyInfo.xcprivacy` is in the app target:

- `NSPrivacyTracking` false
- no tracking domains
- no collected data types
- no required-reason API entries in the app target

The app target’s Swift files do not call UserDefaults, disk-space, or boot-time APIs. Capacitor’s own manifest travels with the Swift package. Check the Organizer privacy report on the build 3 archive. If that report lists a required-reason API the app target uses, add that reason then. Do not add reasons the app does not use.

## Encryption

`ITSAppUsesNonExemptEncryption` is false in `Info.plist`. The store build does not add its own cryptography. Export compliance: the app does not use non-exempt encryption.

## Permissions

`Info.plist` has no usage strings for camera, photos, microphone, location, contacts, Bluetooth, or tracking. Do not add them. Unused strings are a review risk.

## Privacy policy URL

https://superimmersive.io/nsnp-learning-app/privacy

Same page as Play. It says the store apps have no account, how to clear the phone, and how a website-trial record can be deleted. Deploy it before you submit.
