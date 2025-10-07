import './App.css';
import Calculator from './Calculator';
import IPhonePreview from './IPhonePreview';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const iphone = params.get('iphone') === '1';
  const previewOverride = params.get('preview') === '1';

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

  // If percent reaches threshold we could auto-unlock; leave manual lock for now
  const showLiveLink = previewOverride || !UNDER_CONSTRUCTION_LOCKED;

  const content = (
    <div className="site">
      {/* HERO */}
      <header className="hero" aria-labelledby="site-title">
        <h1 id="site-title" className="hero-title-with-avatar">
          <span className="avatar-inline-wrapper">
            <img
              src={import.meta.env.BASE_URL + 'profile-picture.jpg'}
              alt="Bubacar Nget"
              className="avatar-inline"
              onError={(e) => {
                e.target.src = 'https://placehold.co/120x120/1f1f1f/ffffff?text=BN';
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

        {/* Decorative wave divider */}
        <div className="wave" aria-hidden="true">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,64 C120,96 360,112 540,96 C720,80 900,32 1080,40 C1260,48 1380,80 1440,96 L1440,120 L0,120 Z"></path>
          </svg>
        </div>
      </header>

      <main>
        {/* ABOUT */}
        <section className="card" aria-labelledby="about-title">
          <h2 id="about-title">About</h2>
          <p>
            I help small businesses and diaspora projects build clean websites, create simple content
            systems, and automate repetitive work. Straightforward, fast, and focused on results.
          </p>
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

        {/* CALCULATOR */}
        <section className="card" aria-labelledby="calculator-title">
          <h2 id="calculator-title">Try Me!</h2>
          <Calculator />
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
                <ul className="progress-checklist">
                  {projectProgress.tasks.map((t, i) => (
                    <li key={i} className={t.done ? 'done' : 'todo'}>
                      <span className="check-icon" aria-hidden="true">{t.done ? '✔' : '•'}</span>
                      <span className="task-label">{t.label}</span>
                    </li>
                  ))}
                </ul>
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
              {!showLiveLink && (
                <p style={{fontSize:'0.75rem',margin:'4px 0 0',color:'#6b6b6b'}}>
                  Add <code>?preview=1</code> to the URL to view (owner override).
                </p>
              )}
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
              href="https://wa.me/491743173671"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open WhatsApp chat with Bubacar at 0174 317 3671"
            >
              0174 317 3671
            </a>
          </p>

          <div className="social">
            <a
              className="social-link"
              href="https://www.youtube.com/@pmoney186"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube channel @pmoney186"
            >
              YouTube @pmoney186
            </a>
            <a
              className="social-link"
              href="https://www.tiktok.com/@pmoney1861"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok account @pmoney1861"
            >
              TikTok @pmoney1861
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        © 2025 Bubacar Nget
      </footer>
    </div>
  );

  return iphone ? <IPhonePreview>{content}</IPhonePreview> : content;
}