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

function fallbackExtFor() {
  // Always use optimized JPG fallbacks to keep file sizes small.
  // (Our generator flattens transparent PNGs onto white for visual consistency.)
  return 'jpg';
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
  // Use a mid-size variant so browsers never start by fetching a huge original.
  fallback.src = publicAssetUrl(`${buildVariantPath(pathNoQuery, 600, fallbackExt)}${query}`);
  fallback.srcset = buildSrcset(pathNoQuery, query, fallbackExt);
  if (sizes) fallback.sizes = sizes;
  fallback.alt = alt || 'Product';

  // Some inventory folders may be missing a generated variant (edge cases / manual uploads).
  // If that happens, fall back to the original asset path so the image still shows.
  fallback.addEventListener(
    'error',
    () => {
      const original = publicAssetUrl(`${pathNoQuery}${query}`);
      if (fallback.src === original) return;
      fallback.removeAttribute('srcset');
      fallback.removeAttribute('sizes');
      fallback.src = original;
    },
    { once: true },
  );

  picture.appendChild(fallback);
  return { picture, img: fallback };
}

function publicAssetUrl(path) {
  const trimmed = String(path || '').replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${trimmed}`;
}

export function buildCatalogProductId(title, index) {
  const idBase = slugify(title) || 'product';
  return `product-${idBase}-${Number(index) + 1}`;
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
  if (/factory unlocked|frei ab werk/i.test(text)) return 'Factory unlocked';
  if (/no sim lock|ohne simlock|without simlock/i.test(text)) return 'No SIM lock';
  if (/dual sim|sim\s*\+\s*esim|nano.?sim\s*\+\s*esim/i.test(text)) return 'Dual SIM (SIM + eSIM)';
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

  const featuredExtras = [];
  if (extras.includes('Factory unlocked')) featuredExtras.push('Factory unlocked');
  else if (extras.includes('No SIM lock')) featuredExtras.push('No SIM lock');
  if (extras.includes('Dual SIM (SIM + eSIM)')) featuredExtras.push('Dual SIM (SIM + eSIM)');

  let secondSentence = '';
  if (featuredExtras.length) secondSentence = `${featuredExtras.join('. ')}.`;
  else {
    const extra = extras.find(Boolean);
    if (/warranty/i.test(extra || '')) secondSentence = 'Warranty included.';
    else if (/original parts/i.test(extra || '')) secondSentence = 'Original parts.';
    else if (/back glass/i.test(extra || '')) secondSentence = 'Back glass has a crack.';
    else if (/camera/i.test(extra || '')) secondSentence = 'Camera is clear.';
    else if (/sim ready/i.test(extra || '')) secondSentence = 'Ready to use.';
    else if (/touch id|face id/i.test(extra || '')) secondSentence = `${extra}.`;
  }

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
  if (/factory unlocked|frei ab werk/i.test(descriptionText)) pushUnique(extras, 'Factory unlocked');
  if (/no sim lock|ohne simlock|without simlock/i.test(descriptionText)) pushUnique(extras, 'No SIM lock');
  if (/dual sim|sim\s*\+\s*esim|nano.?sim\s*\+\s*esim/i.test(descriptionText)) {
    pushUnique(extras, 'Dual SIM (SIM + eSIM)');
  } else if (/nano.?sim|esim/i.test(descriptionText)) {
    pushUnique(extras, 'SIM ready');
  }

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

function buildCatalogCardDetails(product) {
  const subtitleTokens = splitSubtitleTokens(product?.subtitle);
  const conditionToken = normalizeCondition(product?.condition) || normalizeCondition(subtitleTokens.find(isConditionToken));
  const conditionLabel = conditionToken || 'Ready to use';

  const detailTokens = [];
  const storageLabel = normalizeStorage(product?.storage) || normalizeStorage(subtitleTokens.find(isStorageToken));
  const batteryLabel = normalizeBattery(product?.batteryHealth) || normalizeBattery(subtitleTokens.find(isBatteryToken));
  const colorLabel = product?.color ? toTitleCase(product.color) : '';

  [storageLabel, batteryLabel, colorLabel].forEach((value) => {
    const normalized = normalizeSpace(value);
    if (!normalized || detailTokens.includes(normalized)) return;
    detailTokens.push(normalized);
  });

  if (detailTokens.length < 3) {
    subtitleTokens.forEach((token) => {
      if (detailTokens.length >= 3) return;
      if (isPriceToken(token) || isConditionToken(token) || isStorageToken(token) || isBatteryToken(token)) return;
      const normalized = humanizeExtra(token);
      if (!normalized || detailTokens.includes(normalized)) return;
      detailTokens.push(normalized);
    });
  }

  return {
    conditionLabel,
    detailLine: detailTokens.slice(0, 3).join(' • '),
  };
}

let catalogLightbox;
const WHATSAPP_NUMBER = '4915679652076';

function buildWhatsAppHref(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function ensureCatalogLightbox() {
  if (catalogLightbox) return catalogLightbox;

  const TRACK_PREV = 0;
  const TRACK_CENTER = 1;
  const TRACK_NEXT = 2;

  const overlay = el('div', 'catalog-lightbox');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Product image viewer');
  overlay.setAttribute('aria-hidden', 'true');

  const inner = el('div', 'catalog-lightbox-inner');
  const stage = el('div', 'catalog-lightbox-stage');
  const viewport = el('div', 'catalog-lightbox-viewport');
  const track = el('div', 'catalog-lightbox-track');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'catalog-lightbox-close';
  closeBtn.setAttribute('aria-label', 'Close image');
  closeBtn.textContent = 'Close';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'catalog-lightbox-nav catalog-lightbox-nav-prev';
  prevBtn.setAttribute('aria-label', 'Previous image');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'catalog-lightbox-nav catalog-lightbox-nav-next';
  nextBtn.setAttribute('aria-label', 'Next image');
  nextBtn.textContent = '›';

  const dotsWrap = el('div', 'catalog-lightbox-dots');
  dotsWrap.setAttribute('role', 'tablist');
  dotsWrap.setAttribute('aria-label', 'Image navigation');

  const counter = el('div', 'catalog-lightbox-counter');
  counter.setAttribute('aria-live', 'polite');
  counter.hidden = true;

  const slideImages = [-1, 0, 1].map(() => {
    const slide = el('div', 'catalog-lightbox-slide');
    const img = document.createElement('img');
    img.className = 'catalog-lightbox-img';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    slide.appendChild(img);
    track.appendChild(slide);
    return img;
  });

  viewport.appendChild(track);
  stage.appendChild(viewport);
  inner.appendChild(closeBtn);
  inner.appendChild(counter);
  inner.appendChild(prevBtn);
  inner.appendChild(nextBtn);
  inner.appendChild(stage);
  inner.appendChild(dotsWrap);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  let lastFocus;
  let isOpen = false;
  let gallerySources = [];
  let galleryIndex = 0;
  let galleryAlt = 'Product image';
  let indicatorDots = [];
  let lockedScrollY = 0;
  let bodyInlineStyles = null;
  let activeGestureType = '';
  let pointerId = null;
  let touchId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let gestureAxis = '';
  let dragOffsetX = 0;
  let isTracking = false;
  let isAnimating = false;
  let gestureFrame = 0;
  let animationTimer = 0;

  function normalizeIndex(nextIndex) {
    const total = gallerySources.length;
    if (!total) return 0;
    return (nextIndex % total + total) % total;
  }

  function publicSources() {
    return gallerySources.map((src) => publicAssetUrl(src));
  }

  function clearAnimationTimer() {
    if (!animationTimer) return;
    window.clearTimeout(animationTimer);
    animationTimer = 0;
  }

  function shouldAutoFocusViewerControl() {
    return !((navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches);
  }

  function getSwipeThresholds(width) {
    const isCoarsePointer = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches;
    return isCoarsePointer
      ? { distance: Math.max(40, width * 0.1), velocity: 0.4, minFlickDistance: 12 }
      : { distance: Math.max(56, width * 0.14), velocity: 0.55, minFlickDistance: 18 };
  }

  function findTouch(touchList, identifier) {
    if (identifier === null || identifier === undefined) return null;
    for (const touch of touchList) {
      if (touch.identifier === identifier) return touch;
    }
    return null;
  }

  function resetGestureState() {
    activeGestureType = '';
    pointerId = null;
    touchId = null;
    isTracking = false;
    gestureAxis = '';
  }

  function beginSwipe({ clientX, clientY, gestureType, identifier }) {
    if (!isOpen || gallerySources.length <= 1 || isAnimating) return false;
    if (isTracking && activeGestureType && activeGestureType !== gestureType) return false;

    clearAnimationTimer();
    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }

    activeGestureType = gestureType;
    pointerId = gestureType === 'pointer' ? identifier : null;
    touchId = gestureType === 'touch' ? identifier : null;
    startX = clientX;
    startY = clientY;
    startTime = window.performance.now();
    gestureAxis = '';
    dragOffsetX = 0;
    isTracking = true;
    track.style.transition = 'none';
    return true;
  }

  function updateSwipe({ clientX, clientY, gestureType, identifier, preventDefault }) {
    if (!isTracking || isAnimating || activeGestureType !== gestureType) return;
    if (gestureType === 'pointer' && pointerId !== identifier) return;
    if (gestureType === 'touch' && touchId !== identifier) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (!gestureAxis && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      gestureAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }

    if (gestureAxis === 'y') return;
    if (gestureAxis !== 'x') return;

    preventDefault?.();
    dragOffsetX = deltaX;
    applyDragOffset(deltaX);
  }

  function getTrackWidth() {
    return viewport.clientWidth || stage.clientWidth || window.innerWidth || 1;
  }

  function setTrackPosition(slot, offsetX = 0) {
    const width = getTrackWidth();
    const baseOffset = -width * slot;
    track.style.transform = `translate3d(${baseOffset + offsetX}px, 0, 0)`;
  }

  function lockBodyScroll() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    bodyInlineStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
    };

    document.body.classList.add('catalog-lightbox-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.classList.remove('catalog-lightbox-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    document.body.style.overflowX = '';
    bodyInlineStyles = null;
    window.scrollTo({ top: lockedScrollY, behavior: 'auto' });
  }

  function preloadAround(index) {
    if (gallerySources.length <= 1) return;

    const sources = publicSources();
    [normalizeIndex(index - 1), normalizeIndex(index + 1)].forEach((sourceIndex) => {
      const src = sources[sourceIndex];
      if (!src) return;
      const preloaded = new Image();
      preloaded.decoding = 'async';
      preloaded.src = src;
    });
  }

  function clearSlides() {
    slideImages.forEach((slideImg) => {
      slideImg.removeAttribute('src');
      slideImg.removeAttribute('data-src');
      slideImg.alt = '';
    });
  }

  function renderIndicators() {
    dotsWrap.textContent = '';
    indicatorDots = [];

    if (gallerySources.length <= 1) {
      dotsWrap.hidden = true;
      return;
    }

    dotsWrap.hidden = false;

    gallerySources.forEach((_, dotIndex) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'catalog-lightbox-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `View image ${dotIndex + 1}`);
      dot.setAttribute('aria-selected', dotIndex === galleryIndex ? 'true' : 'false');
      dot.setAttribute('aria-current', dotIndex === galleryIndex ? 'true' : 'false');
      dot.addEventListener('click', () => setImage(dotIndex));
      indicatorDots.push(dot);
      dotsWrap.appendChild(dot);
    });
  }

  function syncIndicators() {
    indicatorDots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === galleryIndex;
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function syncControls() {
    const multiple = gallerySources.length > 1;
    prevBtn.hidden = !multiple;
    nextBtn.hidden = !multiple;
    prevBtn.disabled = !multiple;
    nextBtn.disabled = !multiple;
    counter.hidden = !gallerySources.length;
  }

  function syncCounter() {
    if (!gallerySources.length) {
      counter.textContent = '';
      counter.hidden = true;
      return;
    }

    counter.hidden = false;
    counter.textContent = `${galleryIndex + 1} / ${gallerySources.length}`;
  }

  function resetTrackPosition() {
    dragOffsetX = 0;
    clearAnimationTimer();
    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }
    track.style.transition = '';
    setTrackPosition(TRACK_CENTER, 0);
  }

  function applyDragOffset(offsetX) {
    if (gestureFrame) return;

    gestureFrame = window.requestAnimationFrame(() => {
      gestureFrame = 0;
      const width = stage.clientWidth || window.innerWidth || 1;
      const limitedOffset = Math.max(-width * 0.9, Math.min(width * 0.9, offsetX));
      track.style.transition = 'none';
      setTrackPosition(TRACK_CENTER, limitedOffset);
    });
  }

  function renderTrackImages() {
    if (!gallerySources.length) return;

    const sources = publicSources();
    slideImages.forEach((slideImg, slotIndex) => {
      const relativeOffset = slotIndex - 1;
      const sourceIndex = gallerySources.length <= 1 && relativeOffset !== 0
        ? -1
        : normalizeIndex(galleryIndex + relativeOffset);
      const src = sourceIndex >= 0 ? sources[sourceIndex] : '';

      if (!src) {
        slideImg.removeAttribute('src');
        slideImg.removeAttribute('data-src');
        slideImg.alt = '';
        return;
      }

      if (slideImg.dataset.src !== src) {
        slideImg.src = src;
        slideImg.dataset.src = src;
      }

      slideImg.alt = `${galleryAlt || 'Product image'} (${sourceIndex + 1} of ${gallerySources.length})`;
      slideImg.loading = slotIndex === 1 ? 'eager' : 'lazy';
    });

    track.style.transition = 'none';
    setTrackPosition(TRACK_CENTER, 0);
    syncControls();
    syncCounter();
    syncIndicators();
    preloadAround(galleryIndex);

    window.requestAnimationFrame(() => {
      if (!isOpen || isTracking) return;
      track.style.transition = '';
    });
  }

  function setImage(nextIndex) {
    if (!gallerySources.length) return;
    galleryIndex = normalizeIndex(nextIndex);
    renderTrackImages();
  }

  function snapBack() {
    track.style.transition = 'transform 200ms ease';
    setTrackPosition(TRACK_CENTER, 0);
    clearAnimationTimer();
    animationTimer = window.setTimeout(() => {
      animationTimer = 0;
      if (!isOpen) return;
      track.style.transition = '';
    }, 200);
  }

  function animateToImage(direction) {
    if (!gallerySources.length || gallerySources.length <= 1 || isAnimating) return;

    isAnimating = true;
    isTracking = false;
    dragOffsetX = 0;
    clearAnimationTimer();
    track.style.transition = 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';
    setTrackPosition(direction > 0 ? TRACK_NEXT : TRACK_PREV, 0);

    animationTimer = window.setTimeout(() => {
      animationTimer = 0;
      if (!isOpen) {
        isAnimating = false;
        return;
      }

      galleryIndex = normalizeIndex(galleryIndex + direction);
      renderTrackImages();
      isAnimating = false;
    }, 220);
  }

  function next() {
    animateToImage(1);
  }

  function prev() {
    animateToImage(-1);
  }

  function onDocumentKeydown(event) {
    if (!isOpen) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') prev();
    if (event.key === 'ArrowRight') next();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    isAnimating = false;
    resetGestureState();
    clearAnimationTimer();
    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }
    unlockBodyScroll();
    document.removeEventListener('keydown', onDocumentKeydown);
    overlay.remove();
    catalogLightbox = null;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function open({ src, sources, index, alt, focusEl }) {
    const providedSources = Array.isArray(sources) ? sources.filter(Boolean) : [];
    const uniqueSources = Array.from(new Set(providedSources.length ? providedSources : [src].filter(Boolean)));
    if (!uniqueSources.length) return;

    lastFocus = focusEl || document.activeElement;
    gallerySources = uniqueSources;
    galleryAlt = alt || 'Product image';
    galleryIndex = normalizeIndex(typeof index === 'number' ? index : 0);
    renderIndicators();
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onDocumentKeydown);
    lockBodyScroll();
    isOpen = true;
    setImage(galleryIndex);
    if (shouldAutoFocusViewerControl()) {
      closeBtn.focus({ preventScroll: true });
    }
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!beginSwipe({ clientX: event.clientX, clientY: event.clientY, gestureType: 'pointer', identifier: event.pointerId })) return;

    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture failures.
    }
  });

  viewport.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    updateSwipe({ clientX: event.clientX, clientY: event.clientY, gestureType: 'pointer', identifier: event.pointerId });
  });

  function finishSwipe({ clientX, gestureType, identifier } = {}) {
    if (!isTracking) return;
    if (gestureType && activeGestureType && gestureType !== activeGestureType) return;
    if (gestureType === 'pointer' && pointerId !== null && identifier !== pointerId) return;
    if (gestureType === 'touch' && touchId !== null && identifier !== touchId) return;

    const resolvedClientX = clientX ?? startX + dragOffsetX;
    const width = stage.clientWidth || window.innerWidth || 1;
    const elapsed = Math.max((window.performance.now() - startTime) || 1, 1);
    const velocityX = dragOffsetX / elapsed;
    const thresholds = getSwipeThresholds(width);
    const shouldNavigate =
      gestureAxis === 'x' &&
      (Math.abs(dragOffsetX) > thresholds.distance ||
        (Math.abs(velocityX) > thresholds.velocity && Math.abs(dragOffsetX) > thresholds.minFlickDistance));
    const direction = dragOffsetX < 0 ? 1 : -1;

    dragOffsetX = resolvedClientX - startX;
    resetGestureState();

    if (gestureFrame) {
      window.cancelAnimationFrame(gestureFrame);
      gestureFrame = 0;
    }

    if (shouldNavigate) {
      animateToImage(direction);
      return;
    }

    snapBack();
  }

  viewport.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'touch') return;
    finishSwipe({ clientX: event.clientX, gestureType: 'pointer', identifier: event.pointerId });
    try {
      viewport.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore capture release failures.
    }
  });

  viewport.addEventListener('pointercancel', (event) => {
    if (event.pointerType === 'touch') return;
    finishSwipe({ clientX: event.clientX, gestureType: 'pointer', identifier: event.pointerId });
    try {
      viewport.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore capture release failures.
    }
  });

  viewport.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch' || event.pointerType === 'mouse') return;
    finishSwipe({ clientX: event.clientX, gestureType: 'pointer', identifier: event.pointerId });
    try {
      viewport.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore capture release failures.
    }
  });

  viewport.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.changedTouches[0];
    beginSwipe({ clientX: touch.clientX, clientY: touch.clientY, gestureType: 'touch', identifier: touch.identifier });
  }, { passive: true });

  viewport.addEventListener('touchmove', (event) => {
    const touch = findTouch(event.changedTouches, touchId);
    if (!touch) return;
    updateSwipe({ clientX: touch.clientX, clientY: touch.clientY, gestureType: 'touch', identifier: touch.identifier, preventDefault: () => event.preventDefault() });
  }, { passive: false });

  viewport.addEventListener('touchend', (event) => {
    const touch = findTouch(event.changedTouches, touchId);
    if (!touch) return;
    finishSwipe({ clientX: touch.clientX, gestureType: 'touch', identifier: touch.identifier });
  }, { passive: true });

  viewport.addEventListener('touchcancel', (event) => {
    const touch = findTouch(event.changedTouches, touchId);
    if (!touch) {
      resetGestureState();
      snapBack();
      return;
    }
    finishSwipe({ clientX: touch.clientX, gestureType: 'touch', identifier: touch.identifier });
  }, { passive: true });

  catalogLightbox = { open, close, overlay, closeBtn };
  return catalogLightbox;
}

export function renderCatalog({ mountEl, products, startIndex = 0, imageSizes } = {}) {
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
  const absoluteIndex = startIndex + index;
  card.id = buildCatalogProductId(titleText, absoluteIndex);
    card.dataset.title = titleText;
    if (subtitleText) card.dataset.subtitle = subtitleText;
    card.dataset.search = `${titleText} ${subtitleText}`.toLowerCase();
  card.dataset.index = String(absoluteIndex);

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
  const details = buildCatalogCardDetails(product);
    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const imagesToUse = images.length ? images : [product.image].filter(Boolean);
    const firstImage = imagesToUse[0] || '';

    const slider = el('div', 'catalog-slider');
    const zoomBtn = document.createElement('button');
    zoomBtn.type = 'button';
    zoomBtn.className = 'catalog-zoom';
    zoomBtn.setAttribute('aria-label', `Open photos for ${titleText}`);

    const track = el('div', 'catalog-track');
    let currentImageIndex = 0;
    let activeImage = firstImage;
    let mainImgEl = null;

    imagesToUse.forEach((src, imageIndex) => {
      const slide = el('div', 'catalog-slide');
      const pictureData = createResponsivePicture({
        src,
        alt: product.alt || titleText || 'Product',
        sizes: imageSizes || '(max-width: 640px) 92vw, (max-width: 960px) 45vw, (max-width: 1280px) 30vw, 22vw',
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
    }

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeDeltaX = 0;
    let isSwiping = false;
    let suppressClickUntil = 0;

    function resetSwipe() {
      swipeStartX = 0;
      swipeStartY = 0;
      swipeDeltaX = 0;
      isSwiping = false;
    }

    function shouldSuppressClick() {
      return window.performance && window.performance.now
        ? window.performance.now() < suppressClickUntil
        : false;
    }

    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shouldSuppressClick()) return;
      if (!activeImage) return;
      ensureCatalogLightbox().open({
        src: activeImage,
        sources: imagesToUse,
        index: currentImageIndex,
        alt: mainImgEl?.alt || titleText,
        focusEl: zoomBtn,
      });
    });

    if (imagesToUse.length >= 2) {
      zoomBtn.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        swipeStartX = touch.clientX;
        swipeStartY = touch.clientY;
        swipeDeltaX = 0;
        isSwiping = false;
      }, { passive: true });

      zoomBtn.addEventListener('touchmove', (event) => {
        if (!swipeStartX && !swipeStartY) return;
        const touch = event.touches[0];
        swipeDeltaX = touch.clientX - swipeStartX;
        const deltaY = touch.clientY - swipeStartY;

        if (!isSwiping) {
          if (Math.abs(swipeDeltaX) < 12 || Math.abs(swipeDeltaX) < Math.abs(deltaY)) return;
          isSwiping = true;
        }

        // Prevent the page from scrolling while swiping between images.
        event.preventDefault();
      }, { passive: false });

      zoomBtn.addEventListener('touchend', () => {
        if (!isSwiping) {
          resetSwipe();
          return;
        }

        const threshold = 38;
        if (Math.abs(swipeDeltaX) >= threshold) {
          updateSlider(swipeDeltaX < 0 ? currentImageIndex + 1 : currentImageIndex - 1);
          suppressClickUntil = (window.performance?.now?.() || Date.now()) + 420;
        }

        resetSwipe();
      }, { passive: true });

      zoomBtn.addEventListener('touchcancel', () => {
        resetSwipe();
      }, { passive: true });
    }

    zoomBtn.appendChild(track);
    slider.appendChild(zoomBtn);

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

      prevBtn.addEventListener('click', (event) => {
        updateSlider(currentImageIndex - 1);
      });
      nextBtn.addEventListener('click', (event) => {
        updateSlider(currentImageIndex + 1);
      });

      slider.appendChild(prevBtn);
      slider.appendChild(nextBtn);
    }

    frame.appendChild(slider);
    card.appendChild(frame);

    const body = el('div', 'catalog-card-body');

    const tags = el('div', 'catalog-tags');
    const statusTag = el('span', `catalog-tag ${product?.sold ? 'catalog-tag--sold' : 'catalog-tag--available'}`);
    statusTag.textContent = product?.sold ? 'Sold' : 'Available';
    tags.appendChild(statusTag);

    if (details.conditionLabel) {
      const conditionTag = el('span', 'catalog-tag catalog-tag--neutral');
      conditionTag.textContent = details.conditionLabel;
      tags.appendChild(conditionTag);
    }

    body.appendChild(tags);

    const title = el('h3', 'catalog-title');
    title.textContent = titleText;
    body.appendChild(title);

    const detailLine = details.detailLine || display.summary;
    if (detailLine) {
      const meta = el('p', 'catalog-detail-line');
      meta.textContent = detailLine;
      body.appendChild(meta);
    }

    const condition = el('p', 'catalog-condition');
    condition.textContent = details.conditionLabel;
    body.appendChild(condition);

    if (display.priceLabel) {
      const price = el('p', 'catalog-price');
      appendTextWithPriceSpans(price, display.priceLabel);
      body.appendChild(price);
    }

    if (!product?.sold) {
      const remaining = Number(product?.stockRemaining);
      const lowStockText = String(product?.lowStockText || '').trim();
      const shouldShowLowStock = (Number.isFinite(remaining) && remaining === 1) || Boolean(lowStockText);

      if (shouldShowLowStock) {
        const stock = el('p', 'catalog-stock');
        stock.textContent = lowStockText || 'Only 1 left';
        stock.setAttribute('aria-label', '1 remaining in stock');
        body.appendChild(stock);
      }
    }

    const actions = el('div', 'catalog-actions');

    if (product?.sold) {
      const soldBtn = document.createElement('button');
      soldBtn.type = 'button';
      soldBtn.className = 'btn btn-secondary btn-small btn-sold';
      soldBtn.textContent = 'Sold';
      soldBtn.disabled = true;
      actions.appendChild(soldBtn);
    } else {
      const buyBtn = document.createElement('a');
      buyBtn.className = 'btn btn-primary btn-small';
      const msg = `Hello, I want to buy this product from Uncle Apple Store: ${titleText}${subtitleText ? ` (${subtitleText})` : ''}. Is it available?`;
      buyBtn.href = buildWhatsAppHref(msg);
      buyBtn.target = '_blank';
      buyBtn.rel = 'noopener noreferrer';
      buyBtn.textContent = 'Buy Now';

      if (window.setWhatsAppHref) {
        window.setWhatsAppHref(buyBtn, msg);
      }

      actions.appendChild(buyBtn);
    }

    body.appendChild(actions);
    card.appendChild(body);

    mountEl.appendChild(card);

    rendered.push({
      id: card.id,
      index: absoluteIndex,
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
  const picks = sourceItems.filter((item) => !item.product?.sold).slice(0, 14);

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
  intro.textContent = 'A few cleaner alternatives from other Apple categories if you are still comparing before you buy.';
  wrap.appendChild(intro);

  const indicator = el('div', 'catalog-rail-indicator');
  indicator.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 3; index += 1) {
    indicator.appendChild(el('span', 'catalog-rail-indicator-dot'));
  }
  wrap.appendChild(indicator);

  const rail = el('div', 'catalog-rail');
  rail.setAttribute('aria-label', 'Recommended products');
  picks.forEach((item) => {
    const link = document.createElement('a');
    link.className = 'catalog-rail-card';
    link.href = item.href;

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

    if (item.categoryLabel) {
      const category = el('div', 'catalog-rail-category');
      category.textContent = item.categoryLabel;
      link.appendChild(category);
    }

    const title = el('div', 'catalog-rail-name');
    title.textContent = item.title;
    link.appendChild(title);

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

  wrap.appendChild(rail);
  mountEl.appendChild(wrap);

  let railPointerStartX = 0;
  let railPointerStartY = 0;
  let suppressRailClickUntil = 0;

  rail.addEventListener('pointerdown', (event) => {
    railPointerStartX = event.clientX;
    railPointerStartY = event.clientY;
  }, { passive: true });

  rail.addEventListener('pointermove', (event) => {
    if (!railPointerStartX && !railPointerStartY) return;
    const deltaX = event.clientX - railPointerStartX;
    const deltaY = event.clientY - railPointerStartY;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      suppressRailClickUntil = window.performance.now() + 360;
    }
  }, { passive: true });

  rail.addEventListener('pointerup', () => {
    railPointerStartX = 0;
    railPointerStartY = 0;
  }, { passive: true });

  rail.addEventListener('pointercancel', () => {
    railPointerStartX = 0;
    railPointerStartY = 0;
  }, { passive: true });

  rail.addEventListener('click', (event) => {
    if (window.performance.now() > suppressRailClickUntil) return;
    const link = event.target instanceof Element ? event.target.closest('.catalog-rail-card') : null;
    if (!link) return;
    event.preventDefault();
  }, true);
}
