# Auto Tab Sort

Chrome/Brave extension (Manifest V3) that automatically groups tabs by domain into colored tab groups, and re-sorts them whenever a tab is created, closed, or finishes loading.

## How it works

- Tabs are grouped by hostname (`www.` is stripped) as soon as at least 2 tabs share the same domain.
- Each group gets a deterministic color (always the same for a given domain) and a title matching the domain.
- Standalone tabs (a domain with only one tab, or a URL with no domain such as `chrome://`) are shown before the groups.
- Within a group, tabs are sorted by URL.
- Pinned tabs and tab groups created manually by the user are never touched.
- Clicking the extension icon forces an immediate sort, bypassing the usual 500ms debounce.
- Only "normal" windows are affected (popups/auth windows are ignored).

## Installation (developer mode)

1. Open `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Pin the icon to the toolbar so you can trigger a manual sort.

After any code change, click the reload icon (⟳) on the extension's card in `chrome://extensions`.

## Development

```bash
npm install   # installs Vitest
npm test      # runs the test suite
```

`background.js` is loaded by Chrome as a module-type service worker (`manifest.json`) and imported as-is by the tests (`background.test.js`), which mock the `chrome.tabs` / `chrome.tabGroups` / `chrome.storage.session` APIs.

## Permissions

| Permission  | Usage |
|-------------|-------|
| `tabs`      | Read tab URL/title and move tabs |
| `tabGroups` | Create, rename, and move tab groups |
| `storage`   | Remember (in session) which group belongs to each domain, to avoid creating duplicates or touching manual groups |

## Release process (Chrome Web Store)

Packaging and publishing are automated via `.github/workflows/release.yml`, triggered by pushing a
`vX.Y.Z` tag that matches the `version` in `manifest.json`. The workflow runs the tests, zips the
extension (`npm run package` → `dist/auto-tab-sort.zip`), uploads and publishes the new version to
the Chrome Web Store, then attaches the zip to a GitHub Release.

To cut a release:

```bash
# bump "version" in manifest.json and package.json, then:
git add manifest.json package.json
git commit -m "Bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main vX.Y.Z
```

### One-time setup (manual, outside this repo)

The Chrome Web Store API can only update an *existing* listing — the very first submission has to
be created by hand:

1. Create a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) (one-time $5 registration fee).
2. Click **New Item**, upload a first build of `dist/auto-tab-sort.zip` (run `npm run package` locally), fill in the store listing (description, screenshots, category, privacy practices — this extension doesn't collect or transmit any data) and submit it for review.
3. Once it's approved and public, note the **Extension ID** shown in the dashboard URL.
4. Follow [this guide](https://github.com/fregante/chrome-webstore-upload-keys) to create a Google Cloud OAuth client and generate a refresh token for the Chrome Web Store API.
5. In the GitHub repo settings, add these secrets under **Settings → Secrets and variables → Actions**:
   - `CWS_EXTENSION_ID`
   - `CWS_CLIENT_ID`
   - `CWS_CLIENT_SECRET`
   - `CWS_REFRESH_TOKEN`
   - `CWS_PUBLISHER_ID` (only needed for Google Workspace / brand accounts — leave the secret unset otherwise)

After that, every tag push publishes automatically — no further manual steps in the Web Store dashboard.
