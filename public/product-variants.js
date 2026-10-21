(() => {
  const script = document.currentScript;
  const picker = document.querySelector('#product-variant');
  if (!script || !picker) return;
  const variants = JSON.parse(script.dataset.variants);
  const buttons = [...picker.querySelectorAll('[data-variant]')];
  const priceElement = document.querySelector('.product-price');
  priceElement?.setAttribute('aria-live', 'polite');
  priceElement?.setAttribute('aria-atomic', 'true');
  const update = (index) => {
    const variant = variants[index];
    if (!variant) return;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    const price = `GMD ${variant.price.toLocaleString('en-US')}`;
    document.querySelector('.product-price').textContent = price;
    document.querySelectorAll('.product-detail-item').forEach((item) => {
      const label = item.querySelector('.product-detail-label').textContent.trim().toLowerCase();
      if (label === 'storage') item.querySelector('.product-detail-value').textContent = variant.storage;
      if (label === 'battery health') item.querySelector('.product-detail-value').textContent = variant.batteryHealth;
    });
    document.querySelectorAll('.product-tag').forEach((tag) => {
      if (/^Battery /.test(tag.textContent)) tag.textContent = `Battery ${variant.batteryHealth}`;
      else if (/GB/.test(tag.textContent)) tag.textContent = variant.storage;
    });
    const url = new URL(script.dataset.whatsapp);
    url.searchParams.set('text', `Hi Uncle Apple! I am interested in the used black ${script.dataset.title}, ${variant.storage}, battery ${variant.batteryHealth}, ${price}. Please confirm availability.`);
    document.querySelectorAll('.btn-whatsapp').forEach((link) => { link.href = url.href; });
  };
  buttons.forEach((button, index) => button.addEventListener('click', () => update(index)));
  const selectedIndex = Number(new URLSearchParams(location.search).get('variant'));
  update(Number.isInteger(selectedIndex) && variants[selectedIndex] ? selectedIndex : 0);
})();
