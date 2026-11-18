# My Training — push notifications (test branch)

This folder contains the Cloudflare Worker that schedules rest-completion notifications.

## Required secrets

Generate a VAPID key pair on a computer with Node.js:

```bash
npx web-push generate-vapid-keys
```

In the Cloudflare Worker settings, add these encrypted secrets:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example, `mailto:your-email@example.com`)

Do not commit the private key to GitHub.

## Deploy

From this folder, with Wrangler authenticated to the Cloudflare account:

```bash
npm install
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
npx wrangler deploy
```

The first deployment applies the SQLite Durable Object migration declared in `wrangler.jsonc`.

## API and app origin

The Worker allows requests from `https://byjohndantas.github.io`. If the GitHub Pages site uses a different origin, update `ALLOWED_ORIGIN` in `src/index.js` before deploying.

The app uses these endpoints: `/health`, `/vapid-public-key`, `/subscribe`, `/schedule`, and `/cancel`.

## Important test conditions

- The app must be served over HTTPS and installed on the iPhone Home Screen for iOS Web Push.
- The user must tap **ATIVAR NOTIFICAÇÕES** and grant permission.
- Verify the health endpoint reports `configured: true` before testing a timer.
- Test first with a short rest while the app is open, then backgrounded, then with the screen locked.
- iOS controls notification presentation and sound; web apps cannot guarantee a custom multi-beep pattern or vibration pattern while suspended.
