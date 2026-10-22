# Permanent product URLs

Every catalog listing must have its own `seoSlug`. This value is assigned once
when the listing is created. Never change it when editing a product's title,
price, photos, condition, availability, or position in an array. Never reuse a
removed listing's slug for a different device.

The existing slugs were pinned to their published addresses, so this repair
does not move current product pages. Both the storefront and the SEO generator
use `src/catalog/productUrls.js`. The generator rejects missing, invalid, or
duplicate slugs before overwriting generated pages.

For a new listing, choose a unique slug such as `iphone-13-green-128gb-20261022`.
Keep sold pages available with accurate availability rather than renumbering
other products.

`product-url-redirects.json` maps confirmed historical addresses to current
listings. The initial mappings were recovered from catalog history using
unambiguous product-photo matches within the same category. Ambiguous matches
were excluded. These mappings generate a marked block of forced Netlify 301 rules
in `public/_redirects`; keep manually maintained domain redirects outside that
block. They also generate static pages with zero-second meta refresh, canonical
links, and visible fallback links for GitHub Pages, which ignores `_redirects`.
On GitHub Pages these pages return HTTP 200 and immediately redirect in the
browser; Google interprets an instant meta refresh as a permanent redirect.
Forced Netlify rules take precedence over the static fallback files.
Only current product pages belong in the sitemap.

If a page must move, add its exact old path and the final destination to that
JSON map. Redirects must lead directly to an existing product, never another
redirect, a different device, or the homepage. The build checks these constraints.

# Product structured data

Available devices with a visible numeric price publish `Product` and `Offer`
markup on their individual pages. Price-request and sold listings publish
`WebPage` and breadcrumb markup instead, preserving their canonical URLs,
content, images, and indexability without inventing prices or reviews. Sold
prices stay hidden in the page and its structured data. Category grids publish
an `ItemList` linking to each listing; product rich-result markup belongs on the
individual product pages.
