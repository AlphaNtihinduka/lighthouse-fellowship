# Google Play: internal testing

How the app gets to testers through the Play Store, before the public release (PLAN §10, phase 6).
Testers install and update it from the Play Store like any app, no APK side-loading.

What is different from a public release:

* **Internal testing** reaches up to 100 testers by email, with no Google review wait.
* The `store-test` build still calls the API over plain HTTP (`http://<VPS_IP>:8099`), because
  there is no domain yet. The public release uses the `production` profile, HTTPS only.

## 1. Build the bundle

From `mobile/`:

```sh
npx eas-cli@latest build -p android --profile store-test
```

This makes an `.aab` (Android App Bundle, the format Play wants). `autoIncrement` raises the
`versionCode` on every build; Play refuses a bundle whose versionCode it has seen before.

Signing: EAS signs with the same key as the test APKs. On the first upload, Play takes that as
the **upload key** and keeps its own **app signing key** (Play App Signing). Back up the upload
key from expo.dev → project → Credentials → Android → Download keystore, and keep it out of git.

## 2. Create the app in Play Console

play.google.com/console → **Create app**:

* App name: `Lighthouse Fellowship`; default language: English (United States).
* App or game: **App**. Free or paid: **Free** (this cannot be changed later).
* Tick the declarations, then **Create app**.

The package name, `com.lighthousefellowship.app`, is fixed by the first upload and can never change.

## 3. App content (left menu → Policy and programs → App content)

Play may require some of these before a release can roll out. The answers match the app as it is
now (no sign-in, nothing collected; see `docs/privacy-policy.md`):

| Section | Answer |
|---|---|
| Privacy policy | `https://github.com/AlphaNtihinduka/lighthouse-fellowship/blob/main/docs/privacy-policy.md` (moves to the church domain at release) |
| App access | All functionality is available without special access |
| Ads | No, my app does not contain ads |
| Content rating | Start questionnaire; category **Reference, News, or Educational**; answer **No** to every question; expect "Everyone" / PEGI 3 |
| Target audience | **13 and over** (choosing under 13 brings in the Families policy, which needs more review) |
| Data safety | Does the app collect or share user data? **No**. Is data encrypted in transit? Answer **No** for now: the test build uses HTTP. This changes to Yes with HTTPS at release |
| Advertising ID | No |
| Government app / Financial features / Health | No / none / no |
| News app | No |

**When phase 5 (visitor sign-in) ships, Data safety must be updated _before_ that build is
released:** email collected, for account management, optional, deletable (ADR 0004).

## 4. Store listing

**Grow users → Store presence → Main store listing**: paste the text and upload the graphics in
`docs/store/play/` (see `listing.md` there). Screenshots: at least 2 portrait phone screenshots.
Take them on a phone (Home, the reader, Play mode with the tray, the results screen).

## 5. Internal testing release

1. **Test and release → Testing → Internal testing → Testers**: create an email list (Gmail /
   Google account addresses of the testers) and save. Copy the **opt-in link** shown there.
2. **Releases → Create new release**. Accept Play App Signing if asked.
3. Upload the `.aab` (download it from the EAS build page). The first upload must be done by
   hand in the browser; Google does not allow the first one through the API.
4. Release name: leave the default. Release notes: a line about what to test.
5. **Next → Save and publish** (Google may call it "Start rollout to Internal testing").
6. Send testers the opt-in link. Each tester opens it **signed in to the Google account on the
   list**, taps **Accept**, then installs from the Play Store link on that page. It can take a
   few minutes after rollout before it appears.

A tester who has the side-loaded APK must uninstall it first: the Play copy is re-signed by
Google with a different key, so Android refuses to update one with the other. Their game
progress on that phone is lost (it is stored only on the phone).

## 6. Later builds: upload from the command line

After the first manual upload, `eas submit` can send new builds straight to internal testing
(the `store-test` submit profile in `eas.json`, track `internal`). It needs a Google service
account key, once:

1. Follow https://expo.fyi/creating-google-service-account to create the service account and
   give it access in Play Console (Users and permissions → Invite → the service account email;
   permission "Release apps to testing tracks").
2. Upload its JSON key to EAS: expo.dev → project → Credentials → Android → Google Service
   Account Key. **Never commit the JSON file.**
3. Then, from `mobile/`:

   ```sh
   npx eas-cli@latest build -p android --profile store-test --auto-submit
   ```

## Personal developer accounts: before going public

Personal Play accounts created after 13 November 2023 must run a **closed test** with at least
**12 testers opted in for 14 days in a row** before Google allows a production release. Start
that early, in parallel with phase 5 and the domain work:

**Testing → Closed testing → Create track**, add the testers (12+, they must stay opted in for the
whole 14 days), promote the same build from internal testing, and send them that track's opt-in
link. Unlike internal testing, closed testing goes through a Google review (usually 1–3 days).
