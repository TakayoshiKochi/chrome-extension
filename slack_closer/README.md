# Slack Closer

A small Manifest V3 Chrome extension that closes the originating tab when it navigates to Slack's desktop-app URL scheme (`slack://`). This is intended for Slack links that hand off to the installed desktop app.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `slack_closer` folder.

## Behavior and limitation

The extension closes the originating tab either when any frame navigates to Slack's `slack:` protocol or when visible page text contains **“We’ve redirected you to the desktop app.”** (straight and curly apostrophes are both recognized). It does not close a Slack HTTPS page just because it loaded; the redirect notice must appear, or the browser must begin a `slack:` handoff.

A content script watches `https://*.slack.com/*` and `https://slack.com/*` for the notice. Chrome does not expose whether the desktop app ultimately finished launching; the visible notice is used as the requested signal. The `webNavigation` permission is used for direct `slack:` protocol handoffs.

## Test

Run from the repository root:

```sh
node --test slack_closer/*.test.cjs
```
