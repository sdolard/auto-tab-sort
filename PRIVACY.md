# Privacy Policy — Auto Tab Sort

Auto Tab Sort does not collect, store, or transmit any user data.

- The extension reads the URL of currently open tabs (via the `tabs` permission) only to determine each tab's domain, for grouping and duplicate detection. This happens locally, in your browser, and the URLs themselves are never stored or sent anywhere.
- The only thing kept in memory is a small mapping of "domain → tab group id" per browser window, stored with `chrome.storage.session`. This mapping is used solely to avoid creating duplicate tab groups when the extension re-sorts tabs. It is automatically cleared when the browser is closed and never leaves your device.
- No analytics, tracking, advertising, or remote servers are used. The extension makes no network requests.

## Contact

Questions about this policy can be raised via [GitHub Issues](https://github.com/sdolard/auto-tab-sort/issues).

_Last updated: 2026-07-21._
