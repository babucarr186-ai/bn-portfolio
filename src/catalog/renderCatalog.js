function publicAssetUrl(path) {
  const trimmed = String(path || '').replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${trimmed}`;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function renderCatalog({ mountEl, products }) {
  if (!mountEl) return;

  mountEl.textContent = '';

  products.forEach((product, index) => {
    const card = el('article', 'catalog-card');
    card.dataset.kind = product.kind || 'laptop';

    const frame = el('div', 'catalog-frame');
    const img = document.createElement('img');
    img.loading = index < 2 ? 'eager' : 'lazy';
    img.decoding = 'async';

    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const firstImage = images[0] || product.image || '';
    img.src = publicAssetUrl(firstImage);
    img.alt = product.alt || product.title || 'Product';

    frame.appendChild(img);
    card.appendChild(frame);

    const title = el('h3', 'catalog-title');
    title.textContent = product.title || 'Product';
    card.appendChild(title);

    if (product.subtitle) {
      const sub = el('p', 'catalog-sub');
      sub.textContent = product.subtitle;
      card.appendChild(sub);
    }

    if (images.length >= 2) {
      const thumbs = el('div', 'catalog-thumbs');
      images.slice(0, 3).forEach((src, thumbIndex) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'catalog-thumb';
        btn.setAttribute('aria-label', `Photo ${thumbIndex + 1}`);
        btn.setAttribute('aria-current', thumbIndex === 0 ? 'true' : 'false');

        const tImg = document.createElement('img');
        tImg.loading = 'lazy';
        tImg.decoding = 'async';
        tImg.src = publicAssetUrl(src);
        tImg.alt = '';

        btn.appendChild(tImg);

        btn.addEventListener('click', () => {
          img.src = publicAssetUrl(src);
          thumbs.querySelectorAll('[aria-current="true"]').forEach((node) => node.setAttribute('aria-current', 'false'));
          btn.setAttribute('aria-current', 'true');
        });

        thumbs.appendChild(btn);
      });
      card.appendChild(thumbs);
    }

    const actions = el('div', 'catalog-actions');

    const waBtn = document.createElement('a');
    waBtn.className = 'btn btn-primary btn-small';
    waBtn.href = '#';
    waBtn.textContent = 'WhatsApp';

    const msg = product.whatsAppMessage || `Hi Uncle Apple! Please confirm availability for: ${product.title}${product.subtitle ? ` (${product.subtitle})` : ''} in The Gambia.`;

    if (window.setWhatsAppHref) {
      window.setWhatsAppHref(waBtn, msg);
    }

    actions.appendChild(waBtn);
    card.appendChild(actions);

    mountEl.appendChild(card);
  });
}
