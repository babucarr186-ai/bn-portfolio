const productPathPattern = /^\/p\/[a-z0-9]+\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;

export function buildProductRedirectBlock(redirects, currentPaths) {
  const lines = Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b)).map(([from, to]) => {
    if (!productPathPattern.test(from) || !productPathPattern.test(to)) {
      throw new Error(`Invalid product redirect: ${from} -> ${to}`);
    }
    if (currentPaths.has(from)) throw new Error(`Redirect would replace a current product: ${from}`);
    if (!currentPaths.has(to)) throw new Error(`Redirect target is not a current product: ${to}`);
    // Force redirects even though a static fallback file exists at this path.
    return `${from} ${to} 301!`;
  });
  return `# PRODUCT-URL-REDIRECTS:START\n${lines.join('\n')}\n# PRODUCT-URL-REDIRECTS:END`;
}

export function buildStaticProductRedirectHtml(target) {
  if (!productPathPattern.test(target)) throw new Error(`Invalid product redirect target: ${target}`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="https://uncleapplestore.com${target}">
  <title>Product moved | Uncle Apple Store</title>
</head>
<body>
  <p>This product has a permanent address. <a href="${target}">View the product at Uncle Apple Store</a>.</p>
</body>
</html>`;
}
