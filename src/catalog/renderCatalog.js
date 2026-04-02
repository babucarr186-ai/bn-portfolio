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
  const rawSrc = String(src || '').trim();
  const safeSrc = rawSrc || 'products/placeholders/placeholder-watch.svg';
  const { path: pathNoQuery, query } = splitQuery(safeSrc);

  const ext = fileExt(pathNoQuery);
  const isSvg = ext === 'svg';

  const picture = document.createElement('picture');

  // SVG (or missing images) should not attempt responsive variants.
  if (isSvg) {
    const fallback = document.createElement('img');
    if (className) fallback.className = className;
    fallback.loading = 'lazy';
    fallback.decoding = 'async';
    fallback.src = publicAssetUrl(`${pathNoQuery}${query}`);
    if (sizes) fallback.sizes = sizes;
    fallback.alt = alt || 'Product';
    picture.appendChild(fallback);
    return { picture, img: fallback };
  }

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
  fallback.src = publicAssetUrl(`${withoutExt(pathNoQuery)}.${fallbackExt}${query}`);
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

function appendTextWithPriceSpans(parent, text) {
  const value = String(text || '');
  if (!value) return;

  // Match common GMD formats, e.g. "GMD 25,000" or "GMD25,000".
  const re = /(GMD\s*\d[\d,]*)/g;
  let lastIndex = 0;
  let match;

  while ((match = re.exec(value)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (start > lastIndex) {
      parent.appendChild(document.createTextNode(value.slice(lastIndex, start)));
    }

    const span = document.createElement('span');
    span.className = 'product-price';
    span.textContent = match[0];
    parent.appendChild(span);

    lastIndex = end;
  }

  if (lastIndex < value.length) {
    parent.appendChild(document.createTextNode(value.slice(lastIndex)));
  }
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toTitleCase(value) {
  return normalizeSpace(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(price) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return '';
  return `GMD ${new Intl.NumberFormat('en-US').format(amount)}`;
}

function splitSubtitleTokens(text) {
  return normalizeSpace(text)
    .split(/\s*•\s*/)
    .map((part) => normalizeSpace(part))
    .filter(Boolean);
}

function parseBatteryPercent(value) {
  const match = normalizeSpace(value).match(/(\d{2,3})\s*%/);
  return match ? Number(match[1]) : null;
}

function normalizeStorage(value) {
  const match = normalizeSpace(value).match(/(\d+(?:\.\d+)?)\s*(gb|tb)\b/i);
  if (!match) return '';
  return `${match[1]}${match[2].toUpperCase()}`;
}

function normalizeCondition(value) {
  const text = normalizeSpace(value)
    .replace(/^used\s*[—-]\s*/i, '')
    .replace(/^condition\s*[-:]/i, '')
    .replace(/\bcondition\b/gi, '')
    .trim();

  if (!text) return '';
  if (/brand new|sealed/i.test(text)) return 'Brand new';
  if (/like new/i.test(text)) return 'Like new';
  if (/excellent/i.test(text)) return 'Excellent';
  if (/very clean/i.test(text)) return 'Very clean';
  if (/clean/i.test(text)) return 'Clean';
  if (/good/i.test(text)) return 'Good';
  if (/used/i.test(text)) return 'Used';
  return toTitleCase(text);
}

function normalizeBattery(value) {
  const battery = parseBatteryPercent(value);
  return battery ? `Battery ${battery}%` : '';
}

function isPriceToken(value) {
  return /gmd\s*\d|price on request/i.test(value);
}

function isStorageToken(value) {
  return /\b\d+(?:\.\d+)?\s*(gb|tb)\b/i.test(value);
}

function isBatteryToken(value) {
  return /battery/i.test(value) && /%/.test(value);
}

function isConditionToken(value) {
  return /brand new|like new|excellent|very clean|clean|good|used/i.test(value);
}

function humanizeExtra(value) {
  const text = normalizeSpace(value);
  if (!text) return '';
  if (/original parts/i.test(text)) return 'Original parts';
  if (/warranty/i.test(text)) return 'Warranty included';
  if (/nano.?sim|esim/i.test(text)) return 'SIM ready';
  if (/clear camera/i.test(text)) return 'Camera is clear';
  if (/back glass/i.test(text)) return 'Back glass has a crack';
  if (/touch id/i.test(text)) return 'Touch ID ready';
  if (/face id/i.test(text)) return 'Face ID ready';
  return text;
}

function createSalesNote({ conditionLabel, batteryPercent, extras }) {
  const noteParts = [];

  if (/brand new/i.test(conditionLabel)) noteParts.push('Fresh condition');
  else if (/like new/i.test(conditionLabel)) noteParts.push('Clean condition');
  else if (/excellent|very clean/i.test(conditionLabel)) noteParts.push('Very clean condition');
  else if (/clean/i.test(conditionLabel)) noteParts.push('Clean condition');
  else if (/good/i.test(conditionLabel)) noteParts.push('Good everyday condition');
  else if (/used/i.test(conditionLabel)) noteParts.push('Neat used condition');

  if (Number.isFinite(batteryPercent)) {
    if (batteryPercent >= 85) noteParts.push('strong battery');
    else if (batteryPercent >= 80) noteParts.push('good battery');
    else noteParts.push(`battery at ${batteryPercent}%`);
  }

  const firstSentence = noteParts.length
    ? `${noteParts[0].charAt(0).toUpperCase()}${noteParts[0].slice(1)}${noteParts[1] ? `, ${noteParts[1]}` : ''}.`
    : '';

  const extra = extras.find(Boolean);
  let secondSentence = '';
  if (/warranty/i.test(extra || '')) secondSentence = 'Warranty included.';
  else if (/original parts/i.test(extra || '')) secondSentence = 'Original parts.';
  else if (/back glass/i.test(extra || '')) secondSentence = 'Back glass has a crack.';
  else if (/camera/i.test(extra || '')) secondSentence = 'Camera is clear.';
  else if (/sim ready/i.test(extra || '')) secondSentence = 'Ready to use.';
  else if (/touch id|face id/i.test(extra || '')) secondSentence = `${extra}.`;

  if (!firstSentence && !secondSentence) return 'Ready to use.';
  return [firstSentence, secondSentence].filter(Boolean).join(' ');
}

function buildDisplayContent(product) {
  const subtitleTokens = splitSubtitleTokens(product?.subtitle);
  const extras = [];
  const primary = [];
  let storageLabel = normalizeStorage(product?.storage);
  let conditionLabel = normalizeCondition(product?.condition);
  let batteryLabel = normalizeBattery(product?.batteryHealth);
  let priceLabel = '';

  function pushUnique(target, value) {
    const normalized = normalizeSpace(value);
    if (!normalized || target.includes(normalized)) return;
    target.push(normalized);
  }

  subtitleTokens.forEach((token) => {
    if (isPriceToken(token)) {
      if (!priceLabel) priceLabel = token;
      return;
    }

    if (!storageLabel && isStorageToken(token)) {
      storageLabel = normalizeStorage(token);
      return;
    }

    if (!batteryLabel && isBatteryToken(token)) {
      batteryLabel = normalizeBattery(token);
      return;
    }

    if (!conditionLabel && isConditionToken(token)) {
      conditionLabel = normalizeCondition(token);
      return;
    }

    pushUnique(extras, humanizeExtra(token));
  });

  if (!priceLabel && Number.isFinite(Number(product?.price))) {
    priceLabel = formatPrice(product.price);
  }

  pushUnique(primary, storageLabel);
  pushUnique(primary, conditionLabel);
  pushUnique(primary, batteryLabel);

  if (primary.length < 3 && product?.color) {
    pushUnique(primary, toTitleCase(product.color));
  }

  pushUnique(extras, humanizeExtra(product?.warranty));

  const descriptionText = normalizeSpace(product?.description);
  if (/original parts/i.test(descriptionText)) pushUnique(extras, 'Original parts');
  if (/warranty/i.test(descriptionText)) pushUnique(extras, 'Warranty included');
  if (/back glass/i.test(descriptionText)) pushUnique(extras, 'Back glass has a crack');
  if (/camera/i.test(descriptionText)) pushUnique(extras, 'Camera is clear');
  if (/touch id/i.test(descriptionText)) pushUnique(extras, 'Touch ID ready');
  if (/face id/i.test(descriptionText)) pushUnique(extras, 'Face ID ready');
  if (/nano.?sim|esim/i.test(descriptionText)) pushUnique(extras, 'SIM ready');

  const batteryPercent = parseBatteryPercent(batteryLabel || product?.batteryHealth);
  const summary = primary.slice(0, 3).join(' • ');
  const note = createSalesNote({ conditionLabel, batteryPercent, extras });

  return {
    summary,
    note,
    priceLabel,
  };
}

export function buildCatalogCardSummary(product) {
  const display = buildDisplayContent(product);
  return {
    summary: display.summary,
    note: display.note,
    priceLabel: display.priceLabel,
  };
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

    if (product?.sold) {
      card.classList.add('is-sold');
    }

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

    const display = buildCatalogCardSummary(product);
    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const imagesToUse = images.length ? images : [product.image].filter(Boolean);
    const firstImage = imagesToUse[0] || '';

    const slider = el('div', 'catalog-slider');
    const zoomBtn = document.createElement('button');
    zoomBtn.type = 'button';
    zoomBtn.className = 'catalog-zoom';
    zoomBtn.setAttribute('aria-label', `Open photos for ${titleText}`);

    const mediaBadge = el('span', 'catalog-media-badge');
    mediaBadge.textContent = imagesToUse.length >= 2 ? 'Swipe photos' : 'Tap to zoom';

    const track = el('div', 'catalog-track');
    const dots = [];
    let currentImageIndex = 0;
    let activeImage = firstImage;
    let mainImgEl = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerMoved = false;

    imagesToUse.forEach((src, imageIndex) => {
      const slide = el('div', 'catalog-slide');
      const pictureData = createResponsivePicture({
        src,
        alt: product.alt || titleText || 'Product',
        sizes: '(max-width: 640px) 46vw, (max-width: 960px) 31vw, (max-width: 1100px) 23vw, 22vw',
      });

      if (!mainImgEl && imageIndex === 0) mainImgEl = pictureData.img;
      slide.appendChild(pictureData.picture);
      track.appendChild(slide);
    });

    function updateSlider(nextIndex) {
      if (!imagesToUse.length) return;
      currentImageIndex = (nextIndex + imagesToUse.length) % imagesToUse.length;
      activeImage = imagesToUse[currentImageIndex];
      track.style.transform = `translateX(-${currentImageIndex * 100}%)`;
      dots.forEach((dot, dotIndex) => {
        dot.setAttribute('aria-current', dotIndex === currentImageIndex ? 'true' : 'false');
      });
    }

    zoomBtn.addEventListener('pointerdown', (event) => {
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerMoved = false;
    });

    zoomBtn.addEventListener('pointermove', (event) => {
      if (!pointerStartX && !pointerStartY) return;
      if (Math.abs(event.clientX - pointerStartX) > 18 || Math.abs(event.clientY - pointerStartY) > 18) {
        pointerMoved = true;
      }
    });

    zoomBtn.addEventListener('pointerup', (event) => {
      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;

      if (Math.abs(deltaX) > 34 && Math.abs(deltaX) > Math.abs(deltaY)) {
        updateSlider(currentImageIndex + (deltaX < 0 ? 1 : -1));
        pointerMoved = true;
      }

      pointerStartX = 0;
      pointerStartY = 0;
    });

    zoomBtn.addEventListener('click', (event) => {
      if (pointerMoved) {
        event.preventDefault();
        pointerMoved = false;
        return;
      }

      if (!activeImage) return;
      ensureCatalogLightbox().open({
        src: activeImage,
        alt: mainImgEl?.alt || titleText,
        focusEl: zoomBtn,
      });
    });

    zoomBtn.appendChild(track);
    slider.appendChild(zoomBtn);
    slider.appendChild(mediaBadge);

    if (imagesToUse.length >= 2) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'catalog-nav catalog-nav-prev';
      prevBtn.setAttribute('aria-label', `Previous photo for ${titleText}`);
      prevBtn.textContent = '‹';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'catalog-nav catalog-nav-next';
      nextBtn.setAttribute('aria-label', `Next photo for ${titleText}`);
      nextBtn.textContent = '›';

      prevBtn.addEventListener('click', () => updateSlider(currentImageIndex - 1));
      nextBtn.addEventListener('click', () => updateSlider(currentImageIndex + 1));

      slider.appendChild(prevBtn);
      slider.appendChild(nextBtn);

      const dotsWrap = el('div', 'catalog-dots');
      imagesToUse.forEach((_, dotIndex) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'catalog-dot';
        dot.setAttribute('aria-label', `Go to photo ${dotIndex + 1}`);
        dot.setAttribute('aria-current', dotIndex === 0 ? 'true' : 'false');
        dot.addEventListener('click', () => updateSlider(dotIndex));
        dots.push(dot);
        dotsWrap.appendChild(dot);
      });

      slider.appendChild(dotsWrap);
    }

    frame.appendChild(slider);
    card.appendChild(frame);

    if (product?.sold) {
      const soldBadge = el('div', 'catalog-badge catalog-badge-sold');
      soldBadge.textContent = 'SOLD';
      frame.appendChild(soldBadge);
    }

    const title = el('h3', 'catalog-title');
    title.textContent = titleText;
    card.appendChild(title);

    if (display.summary || display.priceLabel) {
      const metaRow = el('div', 'catalog-meta-row');

      if (display.summary) {
        const meta = el('p', 'catalog-meta');
        meta.textContent = display.summary;
        metaRow.appendChild(meta);
      }

      if (display.priceLabel) {
        const price = el('p', 'catalog-price');
        appendTextWithPriceSpans(price, display.priceLabel);
        metaRow.appendChild(price);
      }

      card.appendChild(metaRow);
    }

    if (display.note) {
      const note = el('p', 'catalog-note');
      note.textContent = display.note;
      card.appendChild(note);
    }

    const actions = el('div', 'catalog-actions');

    if (product?.sold) {
      const soldBtn = document.createElement('span');
      soldBtn.className = 'btn btn-secondary btn-small btn-sold';
      soldBtn.textContent = 'Sold Out';
      soldBtn.setAttribute('aria-disabled', 'true');
      actions.appendChild(soldBtn);
    } else {
      const buyBtn = document.createElement('a');
      buyBtn.className = 'btn btn-primary btn-small';
      buyBtn.href = '#';
      buyBtn.textContent = 'Buy Now';

      const msg = `Hello, I want to buy this product from Uncle Apple Store: ${titleText}${subtitleText ? ` (${subtitleText})` : ''}. Is it available?`;
      if (window.setWhatsAppHref) {
        window.setWhatsAppHref(buyBtn, msg);
      }

      actions.appendChild(buyBtn);
    }
    card.appendChild(actions);

    mountEl.appendChild(card);

    rendered.push({
      id: card.id,
      title: titleText,
      subtitle: subtitleText,
      summary: display.summary,
      note: display.note,
      priceLabel: display.priceLabel,
      product,
    });
  });

  return rendered;
}

export function renderRecommendationRail({ mountEl, items }) {
  if (!mountEl) return;

  const sourceItems = Array.isArray(items) ? items.filter((item) => item?.href && item?.title) : [];
  const picks = sourceItems.filter((item) => !item.product?.sold).slice(0, 8);
  const loopItems = picks.length > 1 ? [...picks, ...picks] : picks;

  if (!picks.length) {
    mountEl.textContent = '';
    return;
  }

  mountEl.textContent = '';

  const wrap = el('section', 'catalog-recommendations');
  const heading = el('h3', 'catalog-recommendations-title');
  heading.textContent = 'Other Products You May Like';
  wrap.appendChild(heading);

  const intro = el('p', 'catalog-recommendations-copy');
  intro.textContent = 'Mixed across iPhones, iPads, MacBooks, Watches, AirPods, gift cards, and accessories.';
  wrap.appendChild(intro);

  const rail = el('div', 'catalog-rail');
  rail.setAttribute('aria-label', 'Recommended products');
  loopItems.forEach((item, index) => {
    const link = document.createElement('a');
    link.className = 'catalog-rail-card';
    link.href = item.href;
    if (index >= picks.length) link.setAttribute('data-loop-clone', 'true');

    const media = el('div', 'catalog-rail-media');
    const image = Array.isArray(item.product?.images) ? item.product.images[0] : item.product?.image;
    if (image) {
      const { picture } = createResponsivePicture({
        src: image,
        alt: item.title,
        sizes: '(max-width: 640px) 40vw, 180px',
      });
      media.appendChild(picture);
    }
    link.appendChild(media);

    const title = el('div', 'catalog-rail-name');
    title.textContent = item.title;
    link.appendChild(title);

    if (item.categoryLabel) {
      const category = el('div', 'catalog-rail-category');
      category.textContent = item.categoryLabel;
      link.appendChild(category);
    }

    if (item.summary) {
      const meta = el('div', 'catalog-rail-meta');
      meta.textContent = item.summary;
      link.appendChild(meta);
    }

    if (item.priceLabel) {
      const price = el('div', 'catalog-rail-price');
      appendTextWithPriceSpans(price, item.priceLabel);
      link.appendChild(price);
    }

    if (item.onClick) {
      link.addEventListener('click', item.onClick);
    }

    rail.appendChild(link);
  });

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!reduceMotion) {
    let autoSlideTimer = 0;
    let normalizeRaf = 0;

    function getCycleWidth() {
      if (picks.length <= 1) return 0;
      return rail.scrollWidth / 2;
    }

    function normalizeLoopPosition() {
      normalizeRaf = 0;
      const cycleWidth = getCycleWidth();
      if (!cycleWidth) return;

      if (rail.scrollLeft >= cycleWidth) {
        rail.scrollLeft -= cycleWidth;
      }
    }

    function getStep() {
      const firstCard = rail.querySelector('.catalog-rail-card');
      if (!(firstCard instanceof HTMLElement)) return 220;
      const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap || window.getComputedStyle(rail).gap || '12');
      return firstCard.offsetWidth + (Number.isFinite(gap) ? gap : 12);
    }

    function tick() {
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      if (maxScroll <= 0) return;

      normalizeLoopPosition();

      const step = getStep();
      const nextLeft = rail.scrollLeft + step;
      rail.scrollTo({ left: nextLeft, behavior: 'smooth' });
    }

    function startAutoSlide() {
      if (autoSlideTimer) return;
      autoSlideTimer = window.setInterval(tick, 3200);
    }

    function stopAutoSlide() {
      if (!autoSlideTimer) return;
      window.clearInterval(autoSlideTimer);
      autoSlideTimer = 0;
    }

    rail.addEventListener('pointerenter', stopAutoSlide);
    rail.addEventListener('pointerleave', startAutoSlide);
    rail.addEventListener('focusin', stopAutoSlide);
    rail.addEventListener('focusout', startAutoSlide);
    rail.addEventListener('pointerdown', stopAutoSlide);
    rail.addEventListener('touchstart', stopAutoSlide, { passive: true });
    rail.addEventListener('touchend', startAutoSlide, { passive: true });
    rail.addEventListener('scroll', () => {
      if (normalizeRaf) return;
      normalizeRaf = window.requestAnimationFrame(normalizeLoopPosition);
    }, { passive: true });

    startAutoSlide();
  }

  wrap.appendChild(rail);
  mountEl.appendChild(wrap);
}
