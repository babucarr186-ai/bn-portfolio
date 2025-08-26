import './App.css';

export default function App() {
  return (
    <div className="site">
      {/* HERO */}
      <header className="hero" aria-labelledby="site-title">
        <h1 id="site-title">Bubacar Nget</h1>

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
}