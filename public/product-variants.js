(() => {
  const script = document.currentScript;
  const select = document.querySelector('#product-variant');
  if (!script || !select) return;
  const variants = JSON.parse(script.dataset.variants);
  const update = () => {
    const variant = variants[Number(select.value)];
    if (!variant) return;
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
  select.addEventListener('change', update);
  update();
})();
