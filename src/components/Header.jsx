import { useEffect, useId, useMemo, useState } from 'react';
import { Menu, Search, ShoppingCart, X } from 'lucide-react';

import './Header.css';

const WHATSAPP_NUMBER_E164 = '2203013139';
const WHATSAPP_DISPLAY = '+220 301 3139';

function buildWhatsAppHref(message) {
  const base = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navId = useId();

  const links = useMemo(
    () => [
      { label: 'iPhones', href: './index.html#inventory' },
      { label: 'iPads', href: './ipads.html' },
      { label: 'MacBook', href: './macbook.html' },
      { label: 'Apple Watch', href: './apple-watch.html' },
      { label: 'AirPods', href: './airpods.html' },
      { label: 'Accessories', href: './accessories.html' },
    ],
    [],
  );

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setMobileOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header className="ua-header">
      <div className="ua-header__inner">
        <div className="ua-header__left">
          <button
            type="button"
            className="ua-header__menuBtn"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-controls={navId}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          <a className="ua-header__brand" href="./index.html" aria-label="Uncle Apple Store">
            <img
              className="ua-header__logo"
              src={`${import.meta.env.BASE_URL || './'}logo.jpeg`}
              alt="Uncle Apple Store"
              loading="eager"
              decoding="async"
            />
            <span className="ua-header__brandText">Uncle Apple</span>
          </a>
        </div>

        <nav className="ua-header__nav" aria-label="Primary">
          <ul className="ua-header__navList">
            {links.map((link) => (
              <li key={link.label} className="ua-header__navItem">
                <a className="ua-header__navLink" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ua-header__actions" aria-label="Header actions">
          <button type="button" className="ua-header__iconBtn" aria-label="Search">
            <Search size={18} aria-hidden="true" />
          </button>

          <a href="./cart.html" className="ua-header__iconBtn" aria-label="Cart">
            <ShoppingCart size={18} aria-hidden="true" />
          </a>

          <a
            className="ua-header__whatsApp"
            href={buildWhatsAppHref('Hi Uncle Apple!')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${WHATSAPP_DISPLAY}`}
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div
        id={navId}
        className={mobileOpen ? 'ua-header__mobile ua-header__mobile--open' : 'ua-header__mobile'}
        aria-hidden={!mobileOpen}
      >
        <nav className="ua-header__mobileNav" aria-label="Mobile navigation">
          {links.map((link) => (
            <a
              key={link.label}
              className="ua-header__mobileLink"
              href={link.href}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="ua-header__backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </header>
  );
}
