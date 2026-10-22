const productPathPattern = /^\/p\/[a-z0-9]+\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;

export function buildProductRedirectBlock(redirects, currentPaths) {
  const lines = Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b)).map(([from, to]) => {
    if (!productPathPattern.test(from) || !productPathPattern.test(to)) {
      throw new Error(`Invalid product redirect: ${from} -> ${to}`);
    }
    if (currentPaths.has(from)) throw new Error(`Redirect would replace a current product: ${from}`);
    if (!currentPaths.has(to)) throw new Error(`Redirect target is not a current product: ${to}`);
    return `${from} ${to} 301`;
  });
  return `# PRODUCT-URL-REDIRECTS:START\n${lines.join('\n')}\n# PRODUCT-URL-REDIRECTS:END`;
}
