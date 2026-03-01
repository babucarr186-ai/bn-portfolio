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
