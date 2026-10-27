# Blupi Flow Capture (Chrome extension)

Walk through a flow on any website, capture each step, and turn it into a new
Blupi board: one column per step with its screenshot, plus a touchpoint card
holding the page title and URL. Steps from different sites become separate phases.

## Install (unpacked)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this `chrome-extension` folder.
3. Pin it: puzzle-piece icon in the toolbar → pin **Blupi Flow Capture**.

After pulling changes to this folder, click the reload icon on the extension's
card in `chrome://extensions`.

## Connect

1. In Blupi, go to **Settings → Chrome Extension** and create a token.
2. Click the extension icon to open the side panel, paste the Blupi address and
   the token, and click **Connect**.
   - Live site: `https://blupi-production.up.railway.app`
   - Local dev: `http://localhost:5001`

Tokens can be revoked from the same settings page at any time.

## Use

- **Capture step** (or <kbd>⌥⇧S</kbd> / <kbd>Alt+Shift+S</kbd>) adds the visible
  part of the current page as a step. Change the shortcut at
  `chrome://extensions/shortcuts`.
- **Auto-capture each new page** adds a step whenever the page changes, including
  URL changes in single-page apps. Steps inside one page (modals, multi-step forms
  that keep the same URL) still need a manual capture.
- Rename, annotate, reorder or remove steps in the panel. Nothing leaves your
  computer until you click **Create board**.
- **Create board** uploads the screenshots, creates the board (optionally in a
  project), and opens it.

## How it works

- `background.js` takes screenshots (scaled to 1600px wide, JPEG) and is the only
  writer of the step list in `chrome.storage.local`, so captures and edits can't
  overwrite each other.
- `sidepanel.*` is the UI. It talks to the Blupi API with the token:
  `GET /api/extension/me`, `POST /api/extension/screenshots`,
  `POST /api/extension/boards` (see `server/extension.ts`).
- It needs access to all sites (`<all_urls>`) because Chrome only allows
  screenshots of pages the extension has permission for.
