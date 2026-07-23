# Auto Tab Sort

Chrome/Brave extension (Manifest V3) that automatically groups tabs by domain into colored tab groups, closes duplicate tabs, and re-sorts them whenever a tab is created, closed, or finishes loading.

Available on the [Chrome Web Store](https://chromewebstore.google.com/detail/auto-tab-sort/bfnmbeoakaihlcboagcbjipcfpfigcbf).

## How it works

- Tabs with the exact same URL are deduplicated: only the first (original) one is kept, the rest are closed. If the tab you were on gets closed as a duplicate, the original is selected so you don't lose focus.
- Tabs are grouped by hostname (`www.` is stripped) as soon as at least 2 tabs share the same domain.
- Each group gets a deterministic color (always the same for a given domain) and a title matching the domain.
- Standalone tabs (a domain with only one tab, or a URL with no domain such as `chrome://`) are shown before the groups.
- Within a group, tabs are sorted by URL.
- Pinned tabs and tab groups created manually by the user are never touched.
- Clicking the extension icon forces an immediate sort (including deduplication), bypassing the usual 500ms debounce.
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
| `tabs`      | Read tab URL/title, move tabs, close duplicate tabs, and focus the deduplicated tab |
| `tabGroups` | Create, rename, and move tab groups |
| `storage`   | Remember (in session) which group belongs to each domain, to avoid creating duplicates or touching manual groups |

## Releasing

Maintainer-only release/publishing steps live in [RELEASING.md](RELEASING.md).
