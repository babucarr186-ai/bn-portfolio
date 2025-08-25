import './App.css';

export default function App() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="profile-wrapper">
            <img
              src="/me.jpg"
              alt="Bubacar Nget – Digital Marketer & Web Developer"
              className="profile-pic"
            />
          </div>
          <h1>Bubacar Nget</h1>
          <p className="tag">Digital Marketer • Automation • Web Developer • Content Creator</p>
          <p className="intro">
            I help small businesses and diaspora projects build clean websites, grow on social,
            and automate the boring stuff. Based in Germany • Working worldwide.
          </p>
          <div className="cta">
            <a className="btn" href="mailto:nget@web.de">Email me</a>
            <a
              className="btn outline"
              href="https://wa.me/4915679652076"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section">
        <div className="container">
          <h2>Services</h2>
          <div className="grid">
            <article className="card">
              <h3>Web Design & Dev</h3>
              <p>
                Fast sites with React/Vite, clean UX, mobile-first. Landing pages, mini-shops, and
                portfolios.
              </p>
            </article>
            <article className="card">
              <h3>Digital Marketing</h3>
              <p>
                Content strategy, TikTok/YouTube Shorts, captions, SEO basics, and analytics to grow
                reach.
              </p>
            </article>
            <article className="card">
              <h3>Automation</h3>
              <p>
                Simple bots/flows that save time: lead capture, smart replies, form → sheet, and
                reporting.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="section">
        <div className="container">
          <h2>Projects</h2>
          <div className="grid">
            <a className="card link" href="#" target="_blank" rel="noreferrer">
              <h3>Client Landing Page</h3>
              <p>One-page site for a local brand. 2-day turnaround.</p>
            </a>
            <a className="card link" href="#" target="_blank" rel="noreferrer">
              <h3>Automated Lead Capture</h3>
              <p>Form → Google Sheet + WhatsApp follow-up.</p>
            </a>
            <a className="card link" href="#" target="_blank" rel="noreferrer">
              <h3>YouTube Shorts System</h3>
              <p>Scripts, thumbnails, schedule — 30 days.</p>
            </a>
          </div>
          <p className="note">Replace “#” links with real demos when ready.</p>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section">
        <div className="container">
          <h2>Contact</h2>
          <p>
            Email: <a href="mailto:nget@web.de">nget@web.de</a>
            <br />
            WhatsApp:{' '}
            <a href="https://wa.me/4915679652076" target="_blank" rel="noreferrer">
              +49 15679 652076
            </a>
          </p>
        </div>
      </section>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Bubacar Nget</div>
      </footer>
    </main>
  );
}