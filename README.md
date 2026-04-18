# bn-portfolio (Uncle Apple catalog)

Vite static site + product catalog pages.

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Deploy (Netlify)

This site is a static Vite build.

### Netlify settings

- Build command: `npm run build`
- Publish directory: `dist`
These defaults are also defined in `netlify.toml`.

## Push notifications (Netlify)

This project uses:

- Netlify Functions for subscription + sending
- Netlify Blobs for persistent subscription storage

### Functions

- `/.netlify/functions/push-vapid-key` (GET) — returns `{ publicKey }`
- `/.netlify/functions/push-subscribe` (POST) — stores a subscription
- `/.netlify/functions/push-subscriptions` (GET, admin) — returns stored subscription ids
- `/.netlify/functions/push-send` (POST, admin) — sends a push to all stored subscriptions
- `/.netlify/functions/push-deploy-hook` (POST, deploy webhook) — automatically sends “New Arrival” push after a successful production deploy

### Required environment variables (Netlify Project → Environment variables)

- `VAPID_PUBLIC_KEY` — VAPID public key (Base64URL)
- `VAPID_PRIVATE_KEY` — VAPID private key (Base64URL)
- `VAPID_SUBJECT` — recommended, e.g. `mailto:you@yourdomain.com`
- `PUSH_ADMIN_TOKEN` — random secret string used to protect admin endpoints (`push-send`, `push-subscriptions`)
- `PUSH_DEPLOY_HOOK_TOKEN` — random secret string used to protect the post-deploy webhook endpoint (`push-deploy-hook`)

### Automatic “New Arrival” notifications (after successful deploy)

This repo is wired to send push notifications automatically **only after Netlify reports a successful production deploy**.

**Rule implemented (matches repo requirements):**

- A “new arrival” is a **newly added product entry** in `src/catalog/data/**`.
- It must be **available** (`sold` is not true).
- It must have **stock > 0** (`stockRemaining > 0`). If `stockRemaining` is omitted, the catalog generator treats it as `1`.
- Edits to existing products (price / battery / subtitle/description / stock count changes) do **not** trigger notifications.

#### How it works

1) During build, `scripts/generate-push-catalog-manifest.mjs` generates a catalog snapshot at `public/push-catalog.json`.

2) Netlify is configured with an **Outgoing webhook** for **Deploy succeeded** that calls:

`POST https://YOUR_DOMAIN/.netlify/functions/push-deploy-hook?token=YOUR_PUSH_DEPLOY_HOOK_TOKEN`

3) The `push-deploy-hook` function fetches the **live deployed** `https://YOUR_DOMAIN/push-catalog.json`, compares it against a persisted “seen product keys” set in Netlify Blobs, and sends push notifications only for **previously unseen, available, in-stock** products.

#### Duplicate prevention

- Each product entry gets a stable `key` (derived from category + image-folder hint when available; otherwise a sanitized fallback that ignores price/battery text).
- `push-deploy-hook` stores an ever-growing list of seen keys in Netlify Blobs (`ua-push` store), so the same product entry is only notified once.
- Within a single deploy, notifications are also de-duped by **product title** to avoid sending multiple alerts for the same title.

Important behavior:

- The first time `push-deploy-hook` runs, it **bootstraps** by recording the current catalog as “seen” and sends **no notifications** (so you don’t blast the entire existing catalog).
- For safety, at most **5** new-arrival notifications are sent per deploy.

#### Netlify UI setup (one-time)

1) Set `PUSH_DEPLOY_HOOK_TOKEN` in Netlify environment variables.
2) Netlify → Site configuration → Build & deploy → Deploy notifications → **Outgoing webhooks** → **Deploy succeeded**
3) Add webhook URL:
	 - `https://YOUR_DOMAIN/.netlify/functions/push-deploy-hook?token=YOUR_PUSH_DEPLOY_HOOK_TOKEN`

Once this is configured:

- Add a new product object to one of the files in `src/catalog/data/**`.
- Deploy.
- After the deploy succeeds, subscribers receive:
	- **Title:** `New Arrival at Uncle Apple Store`
	- **Body:** `<product title> is now available. Tap to view.`
	- **Link:** category page anchored to the product card (e.g. `/ipads.html#product-...`).

### Generate VAPID keys

After installing dependencies:

```bash
npx web-push generate-vapid-keys
```

Copy the printed `publicKey` → `VAPID_PUBLIC_KEY` and `privateKey` → `VAPID_PRIVATE_KEY`.

### Send a test notification (admin)

Use your `PUSH_ADMIN_TOKEN` as a Bearer token:

```bash
curl -X POST "https://YOUR_SITE.netlify.app/.netlify/functions/push-send" \
	-H "authorization: Bearer YOUR_PUSH_ADMIN_TOKEN" \
	-H "content-type: application/json" \
	--data '{"title":"Uncle Apple Store","body":"New arrivals are live.","url":"/"}'
```

Notes:

- You must first subscribe on a device in a supported browser.
- If a subscription is expired (HTTP 404/410), it is automatically removed during sends.

## Deploy (GitHub Pages)

GitHub Pages hosts the static site.

Note: **Sell Your Device** submits via WhatsApp (no backend required).

### Static hosting

This repo already includes a GitHub Pages workflow at `.github/workflows/deploy.yml`.

Steps:

- Push to `main`
- GitHub → Settings → Pages → Source: **GitHub Actions**
- Wait for the workflow to publish the site



## Upload / add product photos

All images are served from the `public/` folder.

### 1) Put your photos in these folders

- `public/products/iphones/`
- `public/products/ipads/`
- `public/products/macbooks/`
- `public/products/watches/`
- `public/products/airpods/`
- `public/products/accessories/`
- `public/products/giftcards/`
- `public/products/apple-tv-home/`
- `public/products/inventory/` (homepage inventory carousel)

Use simple lowercase filenames like:

- `iphone-13-front.jpg`
- `iphone-13-back.jpg`
- `iphone-13-side.jpg`

### 2) Tell the site which photos to use

Catalog pages use up to **3** photos per product:

- Edit the files in `src/catalog/data/`
- Example:

```js
images: [
	'products/iphones/iphone-13-front.jpg',
	'products/iphones/iphone-13-back.jpg',
	'products/iphones/iphone-13-side.jpg',
]
```

Homepage inventory carousel uses a single image per item:

- Edit `src/phones.js`
- Example:

```js
image: 'products/inventory/iphone-15-pro-max.jpg'
```

### 3) Commit and push

```bash
git add public/products src/catalog/data src/phones.js
git commit -m "Add product photos"
git push
```
