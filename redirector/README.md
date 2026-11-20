# redirector

A small Manifest V3 Chrome extension that redirects URLs matching regular expressions to other URLs, using the `declarativeNetRequest` API. Rules come from `config.json` in this folder. There is no settings UI.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `redirector` folder.

## Configure

Copy the template, edit it, then click the reload button for redirector on `chrome://extensions`. The extension reads the config on install, on reload, and when the browser starts.

```sh
cp config.example.json config.json
```

`config.json` is ignored by git, so your own rules stay local. `config.example.json` contains:

```json
{
  "rules": [
    {
      "description": "Example: google.com -> www.google.com, keeping path and query",
      "from": "^https://google\\.com/(.*)$",
      "to": "https://www.google.com/\\1"
    }
  ]
}
```

- `from` is an [RE2](https://github.com/google/re2/wiki/Syntax) regular expression matched against the full URL. It becomes a `regexFilter`.
- `to` is the target URL. It becomes a `regexSubstitution`. Use `\1` through `\9` for capture groups (`\0` is the whole match).
- `description` is optional and only for your notes.
- JSON strings need doubled backslashes: write `\\.` for a literal dot and `\\1` for group 1.
- Rules are checked in order, and the first matching rule wins.

**Match the whole URL.** `regexSubstitution` replaces only the part of the URL that matched. Any text after the match stays on the end of the result. End your pattern with `.*$` unless you want that text kept.

With the example rule, `https://google.com/search?q=test` redirects to `https://www.google.com/search?q=test`.

To pull a value out of the query string, capture it and stop at the next `&` or `#`: `\?(?:[^#]*&)?id=([^&#]+).*$`.

Avoid redirect loops. If the target site redirects back to a URL your rule matches, Chrome fails with `ERR_TOO_MANY_REDIRECTS`.

Redirects apply to top-level pages and iframes. If `config.json` is missing or invalid or a regex isn't supported, the extension disables all redirects and logs the error. To see the log, click **service worker** on the extension's card in `chrome://extensions`.

## Test

Run from the repository root:

```sh
node --test redirector/background.test.cjs
```
