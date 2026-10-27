# Android test build (APK)

Test builds are APKs installed directly on phones, no Play Store. They call the test API over
plain HTTP (`http://<VPS_IP>:8099`); release builds (phase 6) use HTTPS only.

## Build

From `mobile/`, signed in to the Expo account that owns the project (`npx expo login --no-browser`
on this Windows machine; the browser login crashes):

```sh
npx eas-cli@latest build -p android --profile preview
```

It runs on Expo's servers (10–20 minutes, the free plan has a monthly build quota) and prints a
link. The build page has an **Install** QR code and a download link for the `.apk`.

* Profiles live in `mobile/eas.json`. `preview` = APK + test API URL. `production` = store build
  (phase 6: add the HTTPS API URL first).
* `mobile/app.config.js` allows plain HTTP only when the profile is not `production`.
* Signing key: created and kept by EAS (remote credentials). Back it up from expo.dev →
  project → Credentials before the first Play Store upload; losing it means a new app listing.
* A JS-only change does not need a new build to reach Expo Go, but testers on the APK need a new
  build (or EAS Update, not set up yet).

## Install on a phone

1. Open the build link on the Android phone (or scan the QR code on the build page).
2. Download the APK and open it. Android asks to allow installing from this source (Chrome or
   Files): allow it once.
3. "Lighthouse Fellowship" appears with the other apps. A newer build installs over the old one
   and keeps progress, as long as it is signed with the same key (EAS does this).

The app only shows **published** notes (publish them in the dashboard).
