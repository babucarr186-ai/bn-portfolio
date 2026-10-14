export function startOfferCountdown(root = document) {
  root.querySelectorAll('[data-offer-expires]').forEach((timer) => {
    if (timer.dataset.countdownStarted) return;
    timer.dataset.countdownStarted = 'true';
    const deadline = Date.parse(timer.dataset.offerExpires);
    if (!Number.isFinite(deadline)) return;
    const scope = timer.closest('article') || root;
    let interval;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (!remaining) {
        clearInterval(interval);
        timer.textContent = 'Offer ended';
        scope.querySelectorAll('.catalog-sale-row, .product-offer-row').forEach((row) => {
          row.textContent = timer.dataset.regularPrice;
          row.style.color = 'inherit';
          row.style.fontWeight = '800';
        });
        document.querySelectorAll('a[href*="wa.me"]').forEach((link) => {
          const url = new URL(link.href);
          if (url.searchParams.get('text')?.includes('iPhone 18 Pro Max')) {
            url.searchParams.set('text', timer.dataset.regularMessage);
            link.href = url.href;
          }
        });
        if (timer.dataset.refreshOnExpiry !== 'true') {
          document.querySelectorAll('p').forEach((paragraph) => {
            if (paragraph.textContent.includes('GMD 120,000')) {
              paragraph.textContent = paragraph.textContent.replaceAll('GMD 120,000', 'GMD 150,000');
            }
          });
        }
        document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
          try {
            const data = JSON.parse(script.textContent);
            const update = (value) => {
              if (!value || typeof value !== 'object') return;
              if (value['@type'] === 'Product' && value.name?.includes('iPhone 18 Pro Max') && value.offers) {
                value.offers.price = '150000';
                if (value.description) value.description = value.description.replaceAll('GMD 120,000', 'GMD 150,000');
                delete value.offers.priceValidUntil;
              }
              Object.values(value).forEach(update);
            };
            update(data);
            script.textContent = JSON.stringify(data);
          } catch { /* Preserve unrelated structured data. */ }
        });
        if (timer.dataset.refreshOnExpiry === 'true') window.location.reload();
        return;
      }
      const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      timer.textContent = '20% offer ends in ' + hours + ':' + minutes + ':' + seconds;
    };
    interval = setInterval(tick, 1000);
    tick();
  });
}
