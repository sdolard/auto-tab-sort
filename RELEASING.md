# Releasing

Maintainer-only notes for cutting a new version and publishing it to the Chrome Web Store.

## Release process (Chrome Web Store)

Packaging is automated via `.github/workflows/release.yml`, triggered by pushing a `vX.Y.Z` tag
that matches the `version` in `manifest.json`. The workflow runs the tests, zips the extension
(`npm run package` → `dist/auto-tab-sort.zip`) and attaches it to a GitHub Release.

**Currently, publishing to the Chrome Web Store is done manually** via the
[Developer Dashboard](https://chrome.google.com/webstore/devconsole): download the zip from the
tag's GitHub Release (or run `npm run package` locally) and upload it as a new package version.
The workflow's Chrome Web Store upload step is skipped automatically as long as the `CWS_*` secrets
below aren't configured — see the one-time setup if you want to switch to automatic publishing later.

To cut a release:

```bash
# bump "version" in manifest.json and package.json, then:
git add manifest.json package.json
git commit -m "Bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main vX.Y.Z
```

## One-time setup (manual, outside this repo)

The Chrome Web Store API can only update an *existing* listing — the very first submission has to
be created by hand:

1. Create a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) (one-time $5 registration fee).
2. Click **New Item**, upload a first build of `dist/auto-tab-sort.zip` (run `npm run package` locally), fill in the store listing (description, screenshots, category, privacy practices — this extension doesn't collect or transmit any data) and submit it for review.
3. Once it's approved and public, note the **Extension ID** shown in the dashboard URL (`bfnmbeoakaihlcboagcbjipcfpfigcbf` for this extension — already done).
4. Follow [this guide](https://github.com/fregante/chrome-webstore-upload-keys) to create a Google Cloud OAuth client and generate a refresh token for the Chrome Web Store API.
5. In the GitHub repo settings, add these secrets under **Settings → Secrets and variables → Actions**:
   - `CWS_EXTENSION_ID`
   - `CWS_CLIENT_ID`
   - `CWS_CLIENT_SECRET`
   - `CWS_REFRESH_TOKEN`
   - `CWS_PUBLISHER_ID` (only needed for Google Workspace / brand accounts — leave the secret unset otherwise)

After that, every tag push publishes automatically — no further manual steps in the Web Store dashboard.
