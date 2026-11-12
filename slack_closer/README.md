# Slack Closer

A small Manifest V3 Chrome extension that closes the originating tab when it navigates to Slack's desktop-app URL scheme (`slack://`). This is intended for Slack links that hand off to the installed desktop app.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `slack_closer` folder.

## Behavior and settings

Click the extension icon to choose a mode:

- **Desktop app** (default): close the originating tab when Slack displays **“We’ve redirected you to the desktop app.”** or begins a `slack:` protocol handoff.
- **Browser**: leave the tab open after the handoff notice. Slack may still launch its desktop app; this setting controls whether Slack Closer closes the tab, not Slack’s own app-launch behavior.

The preference is saved locally with `chrome.storage`. A content script watches `https://*.slack.com/*` and `https://slack.com/*` for the notice. `webNavigation` is used to detect direct `slack:` protocol handoffs. The original icon artwork is in `assets/slack-closer.svg`, with PNG sizes used by Chrome.

## Test

Run from the repository root:

```sh
node --test slack_closer/*.test.cjs
```
