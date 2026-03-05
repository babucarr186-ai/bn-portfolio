import { addToCart } from '../cart.js';

const RESPONSIVE_WIDTHS = [300, 600, 900, 1200];

function splitQuery(url) {
  const raw = String(url || '');
  const idx = raw.indexOf('?');
  if (idx === -1) return { path: raw, query: '' };
  return { path: raw.slice(0, idx), query: raw.slice(idx) };
}

function fileExt(filePath) {
  const m = String(filePath || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function withoutExt(filePath) {
  return String(filePath || '').replace(/\.[^.]+$/, '');
}

function fallbackExtFor(pathNoQuery) {
  // Always use optimized JPG fallbacks to keep file sizes small.
  // (Our generator flattens transparent PNGs onto white for visual consistency.)
  return 'jpg';
}

function buildVariantPath(pathNoQuery, width, ext) {
  return `${withoutExt(pathNoQuery)}-${width}.${ext}`;
}

function buildSrcset(pathNoQuery, query, ext) {
  const base = withoutExt(pathNoQuery);
  return RESPONSIVE_WIDTHS.map((w) => `${publicAssetUrl(`${base}-${w}.${ext}${query}`)} ${w}w`).join(', ');
}

function createResponsivePicture({ src, alt, sizes, className }) {
  const { path: pathNoQuery, query } = splitQuery(src);

  const picture = document.createElement('picture');

  const webp = document.createElement('source');
  webp.type = 'image/webp';
  webp.srcset = buildSrcset(pathNoQuery, query, 'webp');
  if (sizes) webp.sizes = sizes;
  picture.appendChild(webp);

  const fallbackExt = fallbackExtFor(pathNoQuery);
  const fallback = document.createElement('img');
  if (className) fallback.className = className;

  fallback.loading = 'lazy';
  fallback.decoding = 'async';
  try {
    fallback.fetchPriority = 'low';
  } catch {
    // ignore
  }

  // Reasonable default src so browsers without srcset still get an optimized asset.
  // Use the original URL as a guaranteed-safe fallback (srcset drives modern browsers to optimized variants).
  fallback.src = publicAssetUrl(pathNoQuery + query);
  fallback.srcset = buildSrcset(pathNoQuery, query, fallbackExt);
  if (sizes) fallback.sizes = sizes;
  fallback.alt = alt || 'Product';

  picture.appendChild(fallback);
  return { picture, img: fallback };
}

function publicAssetUrl(path) {
  const trimmed = String(path || '').replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${trimmed}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

let catalogLightbox;

function ensureCatalogLightbox() {
  if (catalogLightbox) return catalogLightbox;

  const overlay = el('div', 'catalog-lightbox');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');

  const inner = el('div', 'catalog-lightbox-inner');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'catalog-lightbox-close';
  closeBtn.setAttribute('aria-label', 'Close image');
  closeBtn.textContent = 'Close';

  const img = document.createElement('img');
  img.className = 'catalog-lightbox-img';
  img.alt = '';
  img.decoding = 'async';

  inner.appendChild(closeBtn);
  inner.appendChild(img);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  let lastFocus;

  function close() {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('catalog-lightbox-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function open({ src, alt, focusEl }) {
    lastFocus = focusEl || document.activeElement;
    img.src = publicAssetUrl(src);
    img.alt = alt || 'Product image';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('catalog-lightbox-open');
    closeBtn.focus();
  }

  closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', (event) => {
    if (overlay.getAttribute('aria-hidden') === 'true') return;
    if (event.key === 'Escape') close();
  });

  catalogLightbox = { open, close, overlay, img, closeBtn };
  return catalogLightbox;
}

export function renderCatalog({ mountEl, products }) {
  if (!mountEl) return [];

  mountEl.textContent = '';

  const rendered = [];

  products.forEach((product, index) => {
    const card = el('article', 'catalog-card');
    card.dataset.kind = product.kind || 'laptop';

    const titleText = product.title || 'Product';
    const subtitleText = product.subtitle || '';
    const idBase = slugify(titleText) || `product-${index + 1}`;
    card.id = `product-${idBase}-${index + 1}`;
    card.dataset.title = titleText;
    if (subtitleText) card.dataset.subtitle = subtitleText;
    card.dataset.search = `${titleText} ${subtitleText}`.toLowerCase();

    const frame = el('div', 'catalog-frame');

    if (product?.mediaFit) {
      frame.style.setProperty('--media-fit', String(product.mediaFit));
    }

    if (product?.mediaPad !== undefined && product?.mediaPad !== null && String(product.mediaPad).trim() !== '') {
      const padValue =
        typeof product.mediaPad === 'number' ? `${product.mediaPad}px` : String(product.mediaPad);
      frame.style.setProperty('--media-pad', padValue);
    }

    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const imagesToUse = images;
    const firstImage = imagesToUse[0] || product.image || '';

    const zoomBtn = document.createElement('button');
    zoomBtn.type = 'button';
    zoomBtn.className = 'catalog-zoom';
    zoomBtn.setAttribute('aria-label', `Zoom image for ${titleText}`);

    const initialPic = createResponsivePicture({
      src: firstImage,
      alt: product.alt || titleText || 'Product',
      sizes: '(max-width: 640px) 100vw, (max-width: 960px) 50vw, (max-width: 1100px) 33vw, 25vw',
    });
    let mainImgEl = initialPic.img;

    zoomBtn.appendChild(initialPic.picture);
    frame.appendChild(zoomBtn);
    card.appendChild(frame);

    let activeImage = firstImage;
    zoomBtn.addEventListener('click', () => {
      if (!activeImage) return;
      ensureCatalogLightbox().open({
        src: activeImage,
        alt: mainImgEl.alt || titleText,
        focusEl: zoomBtn,
      });
    });

    const title = el('h3', 'catalog-title');
    title.textContent = titleText;
    card.appendChild(title);

    if (subtitleText) {
      const sub = el('p', 'catalog-sub');
      sub.textContent = subtitleText;
      card.appendChild(sub);
    }

    if (product?.description) {
      const desc = el('p', 'catalog-desc');
      desc.textContent = String(product.description);
      card.appendChild(desc);
    }

    const specs = Array.isArray(product?.specs) ? product.specs.filter(Boolean) : [];
    if (specs.length) {
      const ul = el('ul', 'catalog-specs');
      specs.slice(0, 10).forEach((line) => {
        const li = document.createElement('li');
        li.textContent = String(line);
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    if (imagesToUse.length >= 2) {
      const thumbs = el('div', 'catalog-thumbs');
      imagesToUse.forEach((src, thumbIndex) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'catalog-thumb';
        btn.setAttribute('aria-label', `Photo ${thumbIndex + 1}`);
        btn.setAttribute('aria-current', thumbIndex === 0 ? 'true' : 'false');

        const { picture: tPic, img: tImg } = createResponsivePicture({
          src,
          alt: '',
          sizes: '62px',
        });
        // Thumbs are decorative; keep empty alt.
        tImg.alt = '';

        btn.appendChild(tPic);

        btn.addEventListener('click', () => {
          // Swap the responsive image by rebuilding the <picture>.
          const next = createResponsivePicture({
            src,
            alt: mainImgEl.alt || titleText || 'Product',
            sizes: '(max-width: 640px) 100vw, (max-width: 960px) 50vw, (max-width: 1100px) 33vw, 25vw',
          });
          // Replace the existing <picture> inside the zoom button.
          const current = zoomBtn.querySelector('picture');
          if (current && current.parentNode) current.parentNode.replaceChild(next.picture, current);
          mainImgEl = next.img;
          activeImage = src;
          thumbs
            .querySelectorAll('[aria-current="true"]')
            .forEach((node) => node.setAttribute('aria-current', 'false'));
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

    const msg =
      product.whatsAppMessage ||
      `Hi Uncle Apple! Please confirm availability for: ${titleText}${subtitleText ? ` (${subtitleText})` : ''} in The Gambia.`;

    if (window.setWhatsAppHref) {
      window.setWhatsAppHref(waBtn, msg);
    }

    actions.appendChild(waBtn);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-secondary btn-small';
    addBtn.textContent = 'Add to Cart';
    addBtn.addEventListener('click', () => {
      const baseItem = {
        id: card.id,
        name: titleText,
        storage: subtitleText,
        image: firstImage,
        price: typeof product.price === 'number' ? product.price : 0,
        quantity: 1,
      };

      addToCart(baseItem);

      const prev = addBtn.textContent;
      addBtn.textContent = 'Added';
      addBtn.disabled = true;
      window.setTimeout(() => {
        addBtn.textContent = prev;
        addBtn.disabled = false;
      }, 900);
    });

    actions.appendChild(addBtn);
    card.appendChild(actions);

    mountEl.appendChild(card);

    rendered.push({
      id: card.id,
      title: titleText,
      subtitle: subtitleText,
    });
  });

  return rendered;
}
