(() => {
  const nav = document.querySelector('.nav');
  const catbar = document.querySelector('.nav-links--catbar');
  if (!nav || !catbar) return;

  // Shop: keep the header in normal flow at a constant height. Let the logo
  // scroll out naturally, then pin the category row using a negative sticky top.
  // Hiding the logo at a scroll threshold changes layout and can retrigger that
  // threshold through scroll anchoring, causing a brief jump on iOS.
  if (document.documentElement.dataset.category === 'models') {
    const mobile = window.matchMedia('(max-width: 860px)');
    const updateOffset = () => {
      const offset = Math.max(0, catbar.getBoundingClientRect().top - nav.getBoundingClientRect().top - 4);
      nav.style.setProperty('--shop-nav-top', mobile.matches ? `${-offset}px` : '0px');
    };
    updateOffset();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updateOffset);
      observer.observe(nav);
      observer.observe(catbar);
    }
    window.addEventListener('resize', updateOffset);
    window.addEventListener('pageshow', updateOffset);
    return;
  }

  const update = () => {
    nav.classList.toggle('is-category-sticky', window.scrollY > 96);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('pageshow', update);
})();
