import React, { useState, useEffect } from 'react';
import './App.css';
import IPhonePreview from './IPhonePreview';
import ChatWidget from './ChatWidget';
import Estimator from './Estimator';
import { buildWhatsAppLink } from './contactConfig';
import { Check, Circle, Mail, MessageCircle, Moon, Rocket, Sun } from 'lucide-react';

function ProgressChecklist({ progress }) {
  const [open, setOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 640 : true);
  const iconSize = 14;
  return (
    <div>
      <button
        type="button"
        className="checklist-toggle"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? 'Hide Tasks' : 'Show Tasks'}
      </button>
      {open && (
        <ul className="progress-checklist">
          {progress.tasks.map((t, i) => (
            <li key={i} className={t.done ? 'done' : 'todo'}>
              <span className="check-icon" aria-hidden="true">
                {t.done ? <Check size={iconSize} /> : <Circle size={iconSize} />}
              </span>
              <span className="task-label">{t.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

  // Toggle this to true to lock the under construction external link for visitors
  const UNDER_CONSTRUCTION_LOCKED = true; // set to false when you want it open
  
  // Progress meta for the under construction project (adjust as you complete items)
  const projectProgress = {
    percent: 45, // number 0-100 representing completion
    tasks: [
      { label: 'Initial layout scaffold', done: true },
      { label: 'Hero section design', done: true },
      { label: 'Responsive adjustments', done: true },
      { label: 'Content placeholders', done: true },
      { label: 'SEO basic metadata', done: false },
      { label: 'Contact form wiring', done: false },
      { label: 'Analytics integration', done: false },
      { label: 'Performance pass & polish', done: false }
    ]
  };

  // Update this timestamp when you deploy new progress
  const LAST_UPDATED = '2026-01-02';

  // If percent reaches threshold we could auto-unlock; leave manual lock for now
  const AUTO_UNLOCK_THRESHOLD = 80;
  const autoUnlocked = projectProgress.percent >= AUTO_UNLOCK_THRESHOLD;
  const showLiveLink = autoUnlocked || !UNDER_CONSTRUCTION_LOCKED;

  const content = (
    <div className="site">
      <div className="theme-toggle-wrapper">
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
      {/* HERO */}
      <header className="hero" aria-labelledby="site-title">
        <h1 id="site-title" className="hero-title-with-avatar">
          <span className="avatar-inline-wrapper">
            <img
              src={import.meta.env.BASE_URL + 'profile-picture.jpg'}
              alt="Bubacar Nget"
              className="avatar-inline"
              width={150}
              height={150}
              onError={(e) => {
                e.target.src = 'https://placehold.co/150x150/1f1f1f/ffffff?text=BN';
                e.target.onerror = null;
              }}
              loading="lazy"
            />
          </span>
          <span className="hero-name-text">Bubacar Nget</span>
        </h1>

        {/* Service pills in black shadow boxes */}
        <div className="tagline" aria-label="Core services">
          <span className="pill">Digital Marketing</span>
          <span className="pill">Web Development</span>
          <span className="pill">Automation</span>
        </div>

        {/* Decorative multi-layer ocean-style waves */}
        <div className="wave-stack" aria-hidden="true">
          <div className="wave-layer wave-back"></div>
          <div className="wave-layer wave-mid"></div>
          <div className="wave-layer wave-front"></div>
        </div>
      </header>

      <main>
        {/* ABOUT */}
        <section className="card" aria-labelledby="about-title">
          <h2 id="about-title">About</h2>
          <p>
            Through <strong>BN Tech Solutions</strong>, I assist small businesses and diaspora projects in building efficient websites, intelligent content systems, and practical automation tools. My mission is simple: make technology fast, useful, and impactful.
          </p>
          <p>
            Beyond web solutions, I also developed a solid foundation in industrial automation and PLC programming (Siemens TIA Portal), bridging the gap between digital and industrial innovation. I’m passionate about creating systems that save time, boost efficiency, and empower communities.
          </p>
        </section>

        {/* CTA SECTION */}
        <section className="card cta-section" aria-labelledby="cta-title">
          <h2 id="cta-title" className="cta-heading">Let’s Launch Something</h2>
          <p className="cta-sub">Fast builds. Practical automation. Clear content systems that help you move quicker.</p>
          <div className="cta-buttons">
            <a className="btn btn-primary" href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" aria-label="Start WhatsApp chat">
              <MessageCircle size={16} /> WhatsApp Me
            </a>
            <a className="btn btn-outline" href="mailto:nget@web.de" aria-label="Send email to Bubacar">
              <Mail size={16} /> Email
            </a>
          </div>
          <div className="stack-row" aria-label="Primary technologies and focus areas">
            <span className="stack-badge">React</span>
            <span className="stack-badge">Vite</span>
            <span className="stack-badge">Automation</span>
            <span className="stack-badge">Content Systems</span>
            <span className="stack-badge">SEO Basics</span>
            <span className="stack-badge">Analytics</span>
          </div>
        </section>

        {/* SERVICES */}
        <section className="card" aria-labelledby="services-title">
          <h2 id="services-title">Services</h2>
          <ul className="list">
            <li>Websites (landing pages, portfolios, mini-shops)</li>
            <li>Content &amp; captions (TikTok / YouTube Shorts)</li>
            <li>Light SEO &amp; analytics setup</li>
            <li>Automation (lead capture, email replies, forms → sheets)</li>
          </ul>
        </section>

        <Estimator />

        {/* TESTIMONIALS PLACEHOLDER */}
        <section className="card" aria-labelledby="testimonials-title">
          <h2 id="testimonials-title">Feedback</h2>
          <div className="testimonials-strip" aria-label="Testimonials preview">
            <div className="testimonial">
              Smooth process and clear communication—site delivered faster than expected.
              <cite>— Anna Keller</cite>
            </div>
            <div className="testimonial">
              Automation saved us hours weekly. Simple and effective.
              <cite>— Markus Vogel</cite>
            </div>
            <div className="testimonial">
              Clean structure. Easy to update content now.
              <cite>— Leonie Braun</cite>
            </div>
          </div>
        </section>

        {/* PROJECTS */}
        <section className="card" aria-labelledby="projects-title">
          <h2 id="projects-title">Projects</h2>
          <div className="projects-grid">
            <div className="project-card">
              <h3>Gambia Multikulti e.V.</h3>
              <p>A website for a German-Gambian cultural association promoting intercultural exchange and development projects.</p>
              <div className="project-links">
                <a 
                  href="https://www.gambiamultikultivereinev.de/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="project-link"
                >
                  Visit Website
                </a>
              </div>
              <div className="project-tags">
                <span className="tag">Website Development</span>
                <span className="tag">Cultural Organization</span>
                <span className="tag">Non-Profit</span>
              </div>
            </div>
            <div className="project-card">
              <div className="ribbon" aria-label="Under construction">UNDER CONSTRUCTION</div>
              <h3>Project Under Construction</h3>
              <p>Work in progress: evolving landing experience. Deployed early to gather feedback while features are being built.</p>
              {/* Progress Block */}
              <div className="progress-block" aria-label={`Progress ${projectProgress.percent}% complete`}>
                <div className="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={projectProgress.percent}>
                  <div className="progress-fill" style={{ width: projectProgress.percent + '%' }} />
                </div>
                <div className="progress-percent">{projectProgress.percent}%</div>
                <ProgressChecklist progress={projectProgress} />
                <div className="last-updated" aria-label={`Last updated on ${LAST_UPDATED}`}>Last updated: {LAST_UPDATED}</div>
              </div>
              <div className="project-links">
                {showLiveLink ? (
                  <a
                    href="https://new-page-git-main-babucarr186-9531s-projects.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    View Preview
                  </a>
                ) : (
                  <button
                    type="button"
                    className="project-link locked"
                    aria-disabled="true"
                    title="Preview temporarily locked"
                  >
                    Locked
                  </button>
                )}
              </div>
              <div className="project-tags">
                <span className="tag">In Progress</span>
                <span className="tag">Vercel</span>
                <span className="tag">Landing</span>
              </div>
            </div>
          </div>
        </section>


        {/* CONTACT + SOCIAL */}
        <section className="card" aria-labelledby="contact-title">
          <h2 id="contact-title">Contact</h2>
          <p>
            Email:{' '}
            <a href="mailto:nget@web.de" rel="noopener noreferrer">
              nget@web.de
            </a>
            <br />
            WhatsApp:{' '}
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open WhatsApp chat with Bubacar"
            >
              Chat on WhatsApp
            </a>
          </p>
          <div className="contact-actions">
            <a className="btn btn-primary" href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer">Chat Now</a>
            <a className="btn btn-outline" href="mailto:nget@web.de">Email Me</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        © 2026 Bubacar Nget
      </footer>
    </div>
  );

  return (
    <>
      {iphone ? <IPhonePreview>{content}</IPhonePreview> : content}
      <ChatWidget />
      <a className="floating-cta" href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp to start a project">
        <Rocket size={16} /> Start a Project
      </a>
    </>
  );
}

// Render chat widget outside of conditional wrappers
// NOTE: In Vite main.jsx we mount <App /> only; we can also append ChatWidget here if desired.