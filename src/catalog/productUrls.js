// seoSlug is a permanent listing identifier. Assign it once when adding a
// product; do not change it when editing its title, price, photos or position.
export function getProductSlug(product) {
  const slug = product?.seoSlug;
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Missing or invalid permanent seoSlug for ${product?.title || 'product'}`);
  }
  return slug;
}

export function getProductPath(category, product) {
  if (!/^[a-z0-9]+$/.test(category)) throw new Error(`Invalid product category: ${category}`);
  return `/p/${category}/${getProductSlug(product)}/`;
}

export function validateProductUrls(configs) {
  const paths = new Set();
  for (const { key, products } of configs) {
    for (const product of products) {
      const path = getProductPath(key, product);
      if (paths.has(path)) throw new Error(`Duplicate permanent product URL: ${path}`);
      paths.add(path);
    }
  }
  return paths;
}
