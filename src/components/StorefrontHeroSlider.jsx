import React, { useEffect, useId, useRef, useState } from 'react';
import { storefrontHeroSlides } from '../storefrontHeroSlides.js';
import './StorefrontHeroSlider.css';

const AUTOPLAY_DELAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 56;
const WHATSAPP_NUMBER = '4915679652076';

function buildStorefrontWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function ArrowIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {direction === 'prev' ? <path d="M15 18 9 12l6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

export default function StorefrontHeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState(() => new Set());
  const pointerStateRef = useRef({ startX: 0, startY: 0, tracking: false });
  const carouselId = useId();

  function goToSlide(nextIndex) {
    const normalized = (nextIndex + storefrontHeroSlides.length) % storefrontHeroSlides.length;
    setActiveIndex(normalized);
  }

  function goToNext() {
    goToSlide(activeIndex + 1);
  }

  function goToPrevious() {
    goToSlide(activeIndex - 1);
  }

  useEffect(() => {
    if (isPaused || storefrontHeroSlides.length <= 1) return undefined;

    const timeoutId = window.setTimeout(() => {
      goToNext();
    }, AUTOPLAY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeIndex, isPaused]);

  function handleImageLoad(index) {
    setLoadedSlides((previous) => {
      if (previous.has(index)) return previous;
      const next = new Set(previous);
      next.add(index);
      return next;
    });
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      tracking: true,
    };
    setIsPaused(true);
  }

  function finishSwipe(event) {
    const pointerState = pointerStateRef.current;
    if (!pointerState.tracking) return;

    pointerStateRef.current = { startX: 0, startY: 0, tracking: false };

    const deltaX = event.clientX - pointerState.startX;
    const deltaY = event.clientY - pointerState.startY;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD_PX;

    if (isHorizontalSwipe) {
      if (deltaX < 0) goToNext();
      if (deltaX > 0) goToPrevious();
    }

    setIsPaused(false);
  }

  function handlePointerUp(event) {
    finishSwipe(event);
  }

  function handlePointerCancel() {
    pointerStateRef.current = { startX: 0, startY: 0, tracking: false };
    setIsPaused(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setIsPaused(true);
      goToPrevious();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setIsPaused(true);
      goToNext();
    }
  }

  const activeSlide = storefrontHeroSlides[activeIndex];
  const isActiveSlideLoaded = loadedSlides.has(activeIndex);

  return (
    <section className="uas-hero" aria-label="Featured product highlights">
      <div
        className="uas-hero__shell"
        aria-roledescription="carousel"
        aria-label="Uncle Apple Store featured slides"
      >
        <div className="uas-hero__loading" hidden={isActiveSlideLoaded} aria-hidden="true">
          <div className="uas-hero__loading-card">
            <span className="uas-hero__loading-bar uas-hero__loading-bar--sm" />
            <span className="uas-hero__loading-bar uas-hero__loading-bar--lg" />
            <span className="uas-hero__loading-bar uas-hero__loading-bar--md" />
          </div>
        </div>

        <div className="uas-hero__status" aria-live="polite">
          Slide {activeIndex + 1} / {storefrontHeroSlides.length}
        </div>

        <div
          className="uas-hero__viewport"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="uas-hero__track" style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}>
            {storefrontHeroSlides.map((slide, index) => {
              const HeadingTag = index === 0 ? 'h1' : 'h2';
              const isActive = index === activeIndex;
              const href = slide.whatsappMessage ? buildStorefrontWhatsAppLink(slide.whatsappMessage) : slide.href;
              const target = slide.whatsappMessage ? '_blank' : undefined;
              const rel = slide.whatsappMessage ? 'noopener noreferrer' : undefined;

              return (
                <article
                  key={slide.id}
                  id={`${carouselId}-${slide.id}`}
                  className={`uas-hero__slide${isActive ? ' is-active' : ''}`}
                  aria-hidden={isActive ? 'false' : 'true'}
                  style={{
                    '--uas-hero-object-position': slide.imagePosition || 'center center',
                    '--uas-hero-object-position-mobile': slide.mobileImagePosition || slide.imagePosition || 'center center',
                  }}
                >
                  <div className="uas-hero__media">
                    <img
                      className="uas-hero__image"
                      src={slide.image.src}
                      alt={slide.image.alt}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      decoding="async"
                      onLoad={() => handleImageLoad(index)}
                    />
                  </div>
                  <div className="uas-hero__overlay" aria-hidden="true" />

                  <div className="uas-hero__content">
                    <div className="uas-hero__copy">
                      <p className="uas-hero__eyebrow">{slide.eyebrow}</p>
                      <HeadingTag className="uas-hero__title">{slide.title}</HeadingTag>
                      <p className="uas-hero__subtitle">{slide.subtitle}</p>

                      <div className="uas-hero__actions">
                        <a className="uas-hero__button" href={href} target={target} rel={rel}>
                          {slide.ctaLabel}
                        </a>
                      </div>

                      <div className="uas-hero__meta" aria-label={`${slide.title} highlights`}>
                        {slide.highlights.map((highlight, highlightIndex) => (
                          <div className="uas-hero__meta-item" key={`${slide.id}-${highlight}`}>
                            <strong>{highlightIndex === 0 ? 'Trust' : highlightIndex === 1 ? 'Quality' : 'Support'}</strong>
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="uas-hero__controls">
          <button
            type="button"
            className="uas-hero__nav"
            aria-label="Show previous slide"
            onClick={() => {
              setIsPaused(true);
              goToPrevious();
            }}
          >
            <ArrowIcon direction="prev" />
          </button>

          <div className="uas-hero__dots" role="tablist" aria-label="Choose a featured slide">
            {storefrontHeroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-label={`Show slide ${index + 1}: ${slide.title}`}
                aria-controls={`${carouselId}-${slide.id}`}
                aria-selected={activeIndex === index}
                className={`uas-hero__dot${activeIndex === index ? ' is-active' : ''}`}
                onClick={() => {
                  setIsPaused(true);
                  goToSlide(index);
                }}
              />
            ))}
          </div>

          <button
            type="button"
            className="uas-hero__nav"
            aria-label="Show next slide"
            onClick={() => {
              setIsPaused(true);
              goToNext();
            }}
          >
            <ArrowIcon direction="next" />
          </button>
        </div>

        <p className="uas-hero__status" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }} aria-live="polite">
          {activeSlide.title}
        </p>
      </div>
    </section>
  );
}