# Play Console — Set up your app

App: **NSNP Learning**, package `za.co.superimmersive.nsnp`, Play app id `4973108586448023958`.

The dashboard tasks below are not done yet. **Target audience** and **Data safety** stay blocked until **App access** is saved. Do that one first. Paste these answers. They describe the **store build** (lessons only, no login). They do not describe the website trial. If a later Play version adds accounts, replace Data safety, App access, and the privacy policy before that upload.

Developer account to confirm in the console: **SUPERIMMERSIVE ART (PTY) LTD**. That name is the account, not a line in the public description.

## Privacy policy

URL: `https://superimmersive.io/nsnp-learning-app/privacy`

The page is the web route `/privacy` in this repo. It is not on the public site until that site is deployed. Open the URL in a browser, then paste it. Do not submit production with a dead link.

## App access (sign-in details)

**All functionality is available without special access.**

Reviewer instructions:

> Store builds need no login. They are lessons only. There is no username, password, trial account, or officials section. Open the app. The home screen lists 11 lessons. Open a lesson and try the quiz. Lists, Times, and Certificate are on the bottom bar. The certificate stays locked until all 11 quizzes are passed at 4 out of 5. No credentials are required.

Do not add a demo username. There isn’t one in this binary.

## Ads

**No, the app does not contain ads.**

It does not use the advertising ID. Do not add the `com.google.android.gms.permission.AD_ID` permission.

## Content rating

Start the questionnaire. Email it to the Play Console account address if it asks for a contact. Category of the questionnaire: utility / reference / education, or the closest “reference, news, or educational” option. Then:

| Question | Answer |
| --- | --- |
| Violence | None |
| Sexual content | None |
| Language / profanity | None |
| Controlled substances | None |
| Gambling, real or simulated | None |
| Users can interact or exchange content | No |
| Shares the user’s location with other users | No |
| Digital purchases, loot boxes, or other random paid items | No |
| Unrestricted internet (a browser to the open web) | No. Lessons are packed in the app. |
| Shares personal information | No. The store build does not upload a profile. |

The gas-safety and food-hygiene lessons are workplace instructions. They are not graphic violence and not drug use. The honorarium table is a published stipend scale for training, not a cash prize.

Save and apply the rating. Expect Everyone or a low age rating. The target-audience task below still says the intended audience is 18 and over, because the users are school staff.

## Target audience and content

- Target age groups: **18 and over** only. Do not tick 13–15, under 13, or 16–17.
- The app is **not** designed for children.
- It should not appeal to children: no cartoons aimed at learners, no characters, no games.
- Do not enrol in Designed for Families / the Families policy programme.

Learners do not get accounts. The lessons are for the adults who run the school kitchen.

## Data safety

**No data collected. No data shared.**

The form’s first question, “Does your app collect or share any of the required user data types?”, is **No**.

What stays on the phone, and is therefore not “collected” under Play’s definition (not transmitted off the device to the developer or a third party):

- optional name, school, and role for the learning record
- quiz scores and checklist ticks

There is no account, no analytics SDK, no crash SDK, and no advertising ID.

If Play still asks the follow-ups after a No:

| Question | Answer |
| --- | --- |
| Encrypted in transit | Not applicable. The store build does not transmit user data. |
| Users can request deletion | There is no account. On the Certificate screen, “Clear progress on this phone” deletes the on-device record. Uninstalling deletes it too. A deletion URL is not required for an app that does not let users create an account. |
| Data sold | No |
| Data shared with third parties | No |

Do not declare name, phone number, email, precise location, photos, financial info, health info, device IDs, or app interactions.

`android:allowBackup` is still true, unchanged from the existing project. A user who has Android backup on may copy that on-device storage into their own Google account backup. Superimmersive cannot read it. That is not collection by the developer. Leave the Data safety answer as no collection.

The website trial, which does store names and cellphone numbers, is **not** in this AAB. Do not declare it on this form.

## Government apps

**No.** This is not a government app.

SUPERIMMERSIVE ART (PTY) LTD publishes a training aid about a government programme. The app does not provide government services, identity, benefits, permits, or official submissions. It says in the lessons that it is not a WCED circular. Do not tick “government app” or “developed for a government entity”.

## Financial features

**No** to every financial feature: banking, loans, credit, buy-now-pay-later, crypto, trading, rewards, cash, money transfer, and support for other financial apps.

The honorarium screen shows the April 2026 stipend scale so a coordinator can look up a figure. It does not take payment, store a bank account, or move money.

## Health

**No health features.**

The app is not a medical device, not a fitness tracker, and it does not diagnose, treat, or collect health records. Food-safety and hygiene cards are kitchen training for school staff. Do not select nutrition as a health feature, and do not declare health data.

## Category and contact details

- App category: **Education**
- Tags: education, if offered. Not health, finance, or government.
- Store listing contact email: the email already on the Play developer account. Do not invent a new public address in the listing.
- Phone: optional. Leave blank if you do not already publish one.
- Website: https://superimmersive.io/nsnp-learning-app/

## Store listing

Text in `store/play/listing.md`.

Upload:

- `store/graphics/play-icon-512.png`
- `store/graphics/play-feature-1024x500.png`
- the PNGs in `store/screenshots/play-phone/`

Play asks which store assets were made with AI. These phone screenshots are captures of the running lesson UI. The 512 icon is a render of `app/assets/logo.svg`. The feature graphic is that logo plus one of those screenshots. The lesson pictures visible inside the screenshots are the illustrations already shipped in the app.

No ads declaration beyond the Ads task above. No news app. Not a COVID-19 contact-tracing or status app. If those extra declarations are on the dashboard, answer **No** to both.

## Account deletion (policy centre)

The store app does not allow users to create an account. On the question about account creation, answer **No**. You then do not need a web URL for account deletion.

The privacy page still explains how to clear the phone, and how someone in the separate website trial can ask for a name and cellphone number to be deleted. That trial is not this Play listing.
