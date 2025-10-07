import './App.css';
import Calculator from './Calculator';
import IPhonePreview from './IPhonePreview';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const iphone = params.get('iphone') === '1';

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
              <div className="project-links">
                <a 
                  href="https://new-page-git-main-babucarr186-9531s-projects.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="project-link"
                >
                  View Preview
                </a>
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
              href="https://wa.me/4915679652076"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
            >
              +49 15679 652076
            </a>
            <br />
            Alternative WhatsApp:{' '}
            <a
              href="https://wa.me/491743173671"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp Alternative"
            >
              +49 1743173671
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