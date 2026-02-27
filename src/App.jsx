import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import IPhonePreview from './IPhonePreview';
import ChatWidget from './ChatWidget';
import { buildWhatsAppLink } from './contactConfig';
import { BadgeCheck, Mail, MapPin, MessageCircle, Moon, ShoppingBag, Sun, Truck, ShieldCheck } from 'lucide-react';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const iphone = params.get('iphone') === '1';

  // Theme state
  const storedTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || '';
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) { void e; }
  }, [theme]);
  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark'); }

  const STORE_NAME = 'Uncle Apple';
  const SUPPORT_EMAIL = 'nget@web.de';
  const STORE_LOCATION = 'The Gambia';

  const products = useMemo(
    () => [
      {
        id: 'iphone-pro',
        name: 'iPhone Pro',
        subtitle: 'For power users',
        image: import.meta.env.BASE_URL + 'iphone-pro.svg',
        highlights: ['Pro camera system', 'Fast performance', 'Premium build'],
        options: ['128GB', '256GB', '512GB', '1TB']
      },
      {
        id: 'iphone',
        name: 'iPhone',
        subtitle: 'Balanced and reliable',
        image: import.meta.env.BASE_URL + 'iphone.svg',
        highlights: ['Great everyday camera', 'All‑day battery', 'Smooth iOS experience'],
        options: ['128GB', '256GB', '512GB']
      },
      {
        id: 'iphone-plus',
        name: 'iPhone Plus',
        subtitle: 'Big screen, big battery',
        image: import.meta.env.BASE_URL + 'iphone-plus.svg',
        highlights: ['Large display', 'Extra battery life', 'Perfect for media'],
        options: ['128GB', '256GB', '512GB']
      },
      {
        id: 'iphone-se',
        name: 'iPhone SE',
        subtitle: 'Compact and simple',
        image: import.meta.env.BASE_URL + 'iphone-se.svg',
        highlights: ['Compact size', 'Fast everyday performance', 'Classic feel'],
        options: ['64GB', '128GB', '256GB']
      }
    ],
    []
  );

  const [reqModel, setReqModel] = useState('');
  const [reqStorage, setReqStorage] = useState('');
  const [reqColor, setReqColor] = useState('');
  const [reqCondition, setReqCondition] = useState('Original condition');
  const [reqDelivery, setReqDelivery] = useState('Delivery');
  const [reqNotes, setReqNotes] = useState('');

  function submitAvailabilityRequest(e) {
    e.preventDefault();
    const model = reqModel || 'Not specified';
    const storage = reqStorage || 'Not specified';
    const color = reqColor || 'Not specified';
    const condition = reqCondition || 'Not specified';
    const delivery = reqDelivery || 'Not specified';
    const notes = reqNotes.trim() || '—';

    const msg =
      `Hi ${STORE_NAME}! Please check iPhone availability in ${STORE_LOCATION}.\n` +
      `Model: ${model}\n` +
      `Storage: ${storage}\n` +
      `Color: ${color}\n` +
      `Condition: ${condition}\n` +
      `Delivery/Pickup: ${delivery}\n` +
      `Notes: ${notes}`;

    const url = buildWhatsAppLink(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const content = (
    <div className="site">
      <div className="shop-topbar">
        <div className="shop-brand" aria-label="Store name">
          <ShoppingBag size={18} aria-hidden="true" />
          <span className="shop-brand-name">{STORE_NAME}</span>
        </div>
        <nav className="shop-nav" aria-label="Primary">
          <a href="#models">Models</a>
          <a href="#availability">Availability</a>
          <a href="#support">Support</a>
          <a href="#contact">Contact</a>
        </nav>
        <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle dark mode" aria-pressed={theme === 'dark'}>
          {theme === 'dark' ? (
            <>
              <Sun size={16} /> Light
            </>
          ) : (
            <>
              <Moon size={16} /> Dark
            </>
          )}
        </button>
      </div>

      <header className="hero shop-hero" aria-labelledby="site-title">
        <h1 id="site-title" className="shop-hero-title">Original Apple products, only.</h1>
        <p className="shop-hero-sub">
          Located in {STORE_LOCATION}. Request iPhone availability and we’ll confirm what’s in stock.
        </p>
        <div className="hero-gallery" aria-label="iPhone previews">
          <img className="hero-phone" src={import.meta.env.BASE_URL + 'iphone-pro.svg'} alt="iPhone Pro" loading="lazy" />
          <img className="hero-phone hero-phone-back" src={import.meta.env.BASE_URL + 'iphone.svg'} alt="iPhone" loading="lazy" />
        </div>
        <div className="cta-buttons" aria-label="Primary actions">
          <a
            className="btn btn-primary"
            href={buildWhatsAppLink(`Hi ${STORE_NAME}! I want to request iPhone availability in ${STORE_LOCATION}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} /> Request availability (WhatsApp)
          </a>
          <a className="btn btn-outline" href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={16} /> Email Support
          </a>
        </div>

        <div className="shop-trust" aria-label="Store promises">
          <div className="trust-item"><Truck size={16} aria-hidden="true" /><span>Fast delivery or pickup</span></div>
          <div className="trust-item"><ShieldCheck size={16} aria-hidden="true" /><span>No fake parts</span></div>
          <div className="trust-item"><MapPin size={16} aria-hidden="true" /><span>{STORE_LOCATION}</span></div>
        </div>

        <div className="wave-stack" aria-hidden="true">
          <div className="wave-layer wave-back"></div>
          <div className="wave-layer wave-mid"></div>
          <div className="wave-layer wave-front"></div>
        </div>
      </header>

      <main>
        <section className="card" aria-labelledby="policy-title">
          <h2 id="policy-title">Authenticity policy</h2>
          <p>
            Uncle Apple only sells <strong>original Apple products</strong> and genuine parts.
            If it isn’t Apple original, we don’t deal it or sell it.
          </p>
          <div className="support-points" aria-label="Policy points">
            <div className="support-point"><BadgeCheck size={16} aria-hidden="true" /><span>Original products / genuine parts only</span></div>
            <div className="support-point"><ShieldCheck size={16} aria-hidden="true" /><span>Defects handled with replacement options</span></div>
          </div>
        </section>

        <section className="card" id="models" aria-labelledby="models-title">
          <h2 id="models-title">Featured models</h2>
          <p className="muted">No prices shown online. Request availability and we’ll reply with options.</p>

          <div className="product-grid" role="list" aria-label="iPhone models">
            {products.map((p) => (
              <article key={p.id} className="product-card" role="listitem" aria-label={p.name}>
                <div className="product-top">
                  <div className="product-image">
                    <img className="product-image-img" src={p.image} alt={`${p.name} preview`} loading="lazy" />
                  </div>
                  <div>
                    <h3 className="product-name">{p.name}</h3>
                    <div className="product-sub">{p.subtitle}</div>
                  </div>
                </div>

                <ul className="product-highlights" aria-label="Highlights">
                  {p.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>

                <div className="product-options" aria-label="Storage options">
                  {p.options.map((o) => (
                    <span key={o} className="option-pill">{o}</span>
                  ))}
                </div>

                <a
                  className="btn btn-primary product-cta"
                  href={buildWhatsAppLink(`Hi ${STORE_NAME}! Please confirm availability for: ${p.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> Request availability
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="card" id="availability" aria-labelledby="availability-title">
          <h2 id="availability-title">Request iPhone availability</h2>
          <p className="muted">Send your request and we’ll reply with what’s available in {STORE_LOCATION}.</p>

          <form className="availability-form" onSubmit={submitAvailabilityRequest} aria-label="Availability request form">
            <label className="avail-field">
              <span className="avail-label">Model</span>
              <select className="avail-control" value={reqModel} onChange={(e) => setReqModel(e.target.value)}>
                <option value="">Select a model</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="Other iPhone model">Other iPhone model</option>
              </select>
            </label>

            <label className="avail-field">
              <span className="avail-label">Storage</span>
              <input className="avail-control" value={reqStorage} onChange={(e) => setReqStorage(e.target.value)} placeholder="e.g., 128GB" />
            </label>

            <label className="avail-field">
              <span className="avail-label">Color</span>
              <input className="avail-control" value={reqColor} onChange={(e) => setReqColor(e.target.value)} placeholder="e.g., Black" />
            </label>

            <label className="avail-field">
              <span className="avail-label">Condition</span>
              <select className="avail-control" value={reqCondition} onChange={(e) => setReqCondition(e.target.value)}>
                <option value="Original condition">Original condition</option>
                <option value="New / Sealed">New / Sealed</option>
                <option value="Used (original parts)">Used (original parts)</option>
              </select>
            </label>

            <label className="avail-field">
              <span className="avail-label">Delivery / Pickup</span>
              <select className="avail-control" value={reqDelivery} onChange={(e) => setReqDelivery(e.target.value)}>
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </label>

            <label className="avail-field avail-notes">
              <span className="avail-label">Notes</span>
              <textarea
                className="avail-control"
                rows="3"
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="Any details (dual SIM, preferred size, urgent, etc.)"
              />
            </label>

            <button type="submit" className="btn btn-primary availability-submit">
              <MessageCircle size={16} /> Send request on WhatsApp
            </button>
          </form>
        </section>

        <section className="card" id="support" aria-labelledby="support-title">
          <h2 id="support-title">Support</h2>
          <p>
            Not sure which iPhone to pick? Use the chat (bottom right) and tell us what you care about (camera, battery, size). We’ll help you request availability.
          </p>
          <div className="support-points" aria-label="Support points">
            <div className="support-point"><ShieldCheck size={16} aria-hidden="true" /><span>Condition explained clearly before purchase</span></div>
            <div className="support-point"><Truck size={16} aria-hidden="true" /><span>Delivery updates shared on WhatsApp</span></div>
          </div>
        </section>

        <section className="card" id="contact" aria-labelledby="contact-title">
          <h2 id="contact-title">Contact</h2>
          <p className="muted">Fastest response: WhatsApp. Email also works for invoices and receipts.</p>
          <div className="contact-actions">
            <a className="btn btn-primary" href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            <a className="btn btn-outline" href={`mailto:${SUPPORT_EMAIL}`}>Email</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        © 2026 {STORE_NAME} · {STORE_LOCATION}
      </footer>
    </div>
  );

  return (
    <>
      {iphone ? <IPhonePreview>{content}</IPhonePreview> : content}
      <ChatWidget />
      <a className="floating-cta" href={buildWhatsAppLink(`Hi ${STORE_NAME}! I want to request iPhone availability in ${STORE_LOCATION}.`)} target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp to request iPhone availability">
        <ShoppingBag size={16} /> Request availability
      </a>
    </>
  );
}