// Keep catalog arrays in their original order: product URLs contain array indexes.
// Add listingDate: 'YYYY-MM-DD' when publishing a new product.
export function getListingDate(product) {
  const value = product?.listingDate;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export function formatListingDate(product) {
  const value = getListingDate(product);
  return value ? new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`)) : '';
}

export function getNewestListings(products = []) {
  return products.map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const aDate = getListingDate(a.product);
      const bDate = getListingDate(b.product);
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      // For the same date, a later appended listing comes first.
      return aDate ? b.index - a.index : a.index - b.index;
    });
}
