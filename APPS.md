# Happy Blocks — iOS and Android apps

The apps are the same web game wrapped with [Capacitor](https://capacitorjs.com): one codebase for the
website, iPhone/iPad and Android. App ID (bundle id): **`com.woleywa.happyblocks`** (permanent once in the stores).

## How it fits together

| Path | What |
|------|------|
| `index.html`, `style.css`, `js/`, `icons/` | The game (also served by GitHub Pages) |
| `tools/build-web.js` → `www/` | Copies the game into `www/` (not committed), which the apps carry |
| `capacitor.config.json` | App name, id, colours, splash |
| `ios/` | Xcode project (Swift Package Manager, no CocoaPods) |
| `android/` | Android Studio / Gradle project |
| `assets/` | Source art for app icons and splash (`npm run icons` regenerates every size) |
| `js/native.js` | App-only bits: status bar, haptics, Android back button, share links → web address |
| `.github/workflows/apps.yml` | Builds both apps on every push to `main` (Android APK, unsigned iOS .ipa) |

After changing the game: `npm run sync` (copies it into both apps). The GitHub build does this itself.

## Live updates (no rebuild for game changes)
Every push to `main` also publishes the game files as `bundle-N.zip` plus `update.json` on the
**app-web** release (job `web-update` in `.github/workflows/apps.yml`). At start-up the app
(`js/native.js` → `checkForUpdate`) compares `update.json` with its own `version.json`; if newer, it
downloads the zip in the background ([@capgo/capacitor-updater](https://github.com/Cap-go/capacitor-updater),
self-hosted, no Capgo account, stats off) and uses it **from the next launch**. If a new game copy fails
to start, the app rolls back to the last good one.

- Covered: everything in `index.html`, `style.css`, `js/`, levels, look, online features.
- Still needs a new app build (Xcode/store): new native plugins, icons/splash, app name, permissions.
  Then bump the app build number **and** `MIN_NATIVE_BUILD` in `tools/build-web.js`, so older apps
  don't get game files that need the new native code.
- A store update of the app discards downloaded game copies (`resetWhenUpdate`).

## Try it now

- **Android**: open the latest *Apps* run under the repo's **Actions** tab → *Artifacts* →
  `happy-blocks-android` → unzip → install `app-debug.apk` on an Android phone (allow "install unknown apps").
- **iPhone without the paid account** (a free Apple ID works; the app then runs for 7 days before it needs
  re-signing, and a free Apple ID can have up to 3 such apps):
  - *With a Mac*: open `ios/App/App.xcodeproj` in Xcode (after `npm install && npm run sync`), Signing &
    Capabilities → Team → your Apple ID ("Personal Team"), plug in the iPhone, press Run. On the phone:
    Settings → General → VPN & Device Management → trust your Apple ID, and turn on Developer Mode.
  - *Without a Mac* (Windows or Mac): download `happy-blocks-ios-unsigned` from the latest *Apps* run and
    install the `.ipa` with **Sideloadly** or **AltStore** (they sign it with your Apple ID). Same 7-day limit.
  - Or simply use the web version: Safari → Share → Add to Home Screen — it's the same game.

## To publish

### Apple App Store
1. Join the **Apple Developer Program** ($99/year) — developer.apple.com.
2. In **App Store Connect** → Apps → ➕ New App: platform iOS, name *Happy Blocks*, bundle id
   `com.woleywa.happyblocks` (register it under Certificates, Identifiers & Profiles first), SKU e.g. `happyblocks`.
3. Create an **App Store Connect API key** (Users and Access → Integrations → Keys, role *App Manager*) and add
   to the GitHub repo secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (the .p8 file's contents).
   Then a TestFlight upload job can be added to the workflow — no Mac needed.
4. Store listing: screenshots (6.9" iPhone), description, keywords, support URL, **privacy policy URL**,
   age rating, and the privacy "nutrition label" (email address for accounts; gameplay data; no tracking).

### Google Play
1. **Google Play Console** developer account ($25 once).
2. Create a signing key once (`keytool -genkey -v -keystore happyblocks.jks -alias happyblocks -keyalg RSA -keysize 2048 -validity 10000`)
   and add it as secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`),
   so the workflow can build a signed `.aab` for upload. Keep the keystore safe — it can't be replaced.
3. Store listing: screenshots, description, privacy policy URL, data safety form, content rating.

## Store requirements already covered
- Accounts can be deleted in the app (You → Delete my account) — Apple requires this.
- Email + password only (no Google/Facebook login), so "Sign in with Apple" isn't required.
- No ads or tracking; the app declares no non-exempt encryption (`ITSAppUsesNonExemptEncryption = false`).
- Phones are portrait-only.

## Version numbers
Bump for each store upload: iOS `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in
`ios/App/App.xcodeproj/project.pbxproj`; Android `versionName` / `versionCode` in `android/app/build.gradle`.
