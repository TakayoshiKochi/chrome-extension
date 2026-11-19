# golinker

A small Manifest V3 Chrome extension that expands `go/keyword` shortcuts to a configurable go-link server.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `golinker` folder.
4. Open the extension popup, enter your go-link server URL (for example, `https://links.example.com/`), and save it.

## Use

Navigate to `http://go/keyword` (or `https://go/keyword`). golinker redirects the top-level tab to the configured server URL followed by the path. For example, with `https://links.example.com/` configured, `http://go/team/docs` opens `https://links.example.com/team/docs`. Query strings and fragments are kept.

The server URL must use HTTP or HTTPS and cannot include a query string or fragment. The setting is stored locally in Chrome. The extension only watches navigations to the `go` host and does not alter other sites.

## Test

Run from the repository root:

```sh
node --test golinker/background.test.cjs
```
