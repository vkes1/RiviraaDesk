# ContactFlow Premium — local-first contact manager

A mobile-first browser app prototype for managing 10,000+ contacts without a CRM account or cloud database.

## Run it
- Open `index.html` in a modern browser. For best results and IndexedDB support, serve it from a static HTTPS host such as GitHub Pages.
- CSV import/export works offline.
- Excel `.xlsx` import loads SheetJS from a CDN when needed, so it requires internet the first time. Export Excel sheets to CSV if you need fully offline importing.
- Data is stored in the browser's IndexedDB on this device. It is not synced to another device and is not encrypted by this prototype. Use device lock and regular backups.

## Included
- Responsive dashboard and mobile bottom navigation
- Add/edit/delete contacts, tags, notes, status, follow-up date
- Search and status filters
- Call / WhatsApp / SMS links (you manually review/send messages)
- Message templates with placeholders
- CSV import/export, optional XLSX import, JSON backup/restore
- Duplicate phone number detection
- Follow-up list and basic activity/status analytics
- Offline-first local storage (after app assets are cached by browser/host; this prototype itself does not yet include a service worker)

## Important
This is a working prototype, not a hosted live website. No GitHub repository or deployment was created. Test import and backup with sample data before relying on it for important contacts.
