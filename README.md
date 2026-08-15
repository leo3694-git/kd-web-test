# KD Web Test

Product catalogue website with a public storefront and an administrative interface.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` and enter strong, private administrator credentials.
3. Ensure a local `db.json` and `public/uploads/` directory are available.
4. Run `npm start`, then visit `http://localhost:3000`.

## Data and deployment

This repository intentionally does **not** include `db.json`, uploaded images, credentials, or member data. The existing application currently uses local JSON and disk storage; it is not yet configured for Firebase.

Before production deployment, migrate:

- products and categories to Firestore;
- product images to Firebase Storage;
- member authentication to Firebase Authentication; and
- the Express API to Cloud Functions or Cloud Run, with secrets set as deployment environment variables.

Never commit `.env`, production credentials, or member data.
