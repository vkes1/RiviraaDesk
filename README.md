# Riviraa Desk

A single-file, browser-based contact manager for GitHub Pages.

## Files
- `index.html` — application interface and JavaScript.
- `manifest.json` — basic web app metadata.
- `README.md` — setup and usage notes.

## Deploy on GitHub Pages
1. Upload/replace these files in the root of the `main` branch.
2. Keep the repository's GitHub Pages source set to `main` and `/(root)`.
3. Wait for the Pages deployment to finish.
4. Open the published site and hard-refresh with `Ctrl + Shift + R`.

## Important data note
Contacts are stored in this browser's IndexedDB database named `contactflow-premium-v1`.
Browser storage is device/browser/origin-specific; it does not automatically sync between a phone and laptop.
Do not clear site data if you need existing local contacts. Export a JSON backup regularly.

## Contact actions
Call and SMS use the device/browser's `tel:` and `sms:` handlers. WhatsApp opens the WhatsApp link/Android intent; exact app selection depends on the device and browser.

## Privacy
This version has no cloud database or login configured. Do not store highly sensitive information in a public/shared device browser.
