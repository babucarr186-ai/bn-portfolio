import React, { useEffect, useMemo, useState } from 'react';
import { buildWhatsAppLink } from './contactConfig';
import './App.css';

// Simple scoring/estimate model
const BASES = {
  'Landing Page': 250,
  'Website (3-5 pages)': 499,
  'Portfolio': 449,
  'Mini Shop': 649,
};

const ADDONS = {
  CMS: 50,
  Analytics: 20,
  SEO: 40,
  Automation: 70,
  ContentHelp: 45,
};

const PLATFORMS = ['TikTok','Instagram','YouTube','Facebook','LinkedIn'];

const DEFAULT_STATE = {
  type: 'Landing Page',
  pages: 1,
  cms: false,
  analytics: true,
  seo: true,
  automation: false,
  contentHelp: false,
  platform: 'TikTok',
  timeline: '2-3 weeks',
  notes: '',
};

function currency(n){ return '€' + Math.round(n); }

export default function Estimator(){
  const [form, setForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem('estimator_form')) || DEFAULT_STATE; } catch { return DEFAULT_STATE; }
  });

  useEffect(() => {
    try { localStorage.setItem('estimator_form', JSON.stringify(form)); } catch {}
  }, [form]);

  const MIN_PRICE = 250;
  const price = useMemo(() => {
    const base = BASES[form.type] || 400;
    let total = base;
    // Pages: beyond 1 adds small increment
  if (form.type !== 'Landing Page') total += Math.max(0, form.pages - 3) * 50;
    if (form.cms) total += ADDONS.CMS;
    if (form.analytics) total += ADDONS.Analytics;
    if (form.seo) total += ADDONS.SEO;
    if (form.automation) total += ADDONS.Automation;
    if (form.contentHelp) total += ADDONS.ContentHelp;
    return Math.max(MIN_PRICE, total);
  }, [form]);

  function update(key, value){ setForm(prev => ({ ...prev, [key]: value })); }

  function updateType(t){
    setForm(prev => ({
      ...prev,
      type: t,
      // Ensure sensible pages when moving to multi-page types
      pages: t === 'Landing Page' ? 1 : Math.max(3, prev.pages || 3),
    }));
  }

  function exportWhatsApp(){
    const lines = [
      'Project Brief',
      `Type: ${form.type}`,
      form.type !== 'Landing Page' ? `Pages: ${form.pages}` : undefined,
      `CMS: ${form.cms ? 'Yes' : 'No'}`,
      `Analytics: ${form.analytics ? 'Yes' : 'No'}`,
      `SEO: ${form.seo ? 'Yes' : 'No'}`,
      `Automation: ${form.automation ? 'Yes' : 'No'}`,
      `Content Help: ${form.contentHelp ? 'Yes' : 'No'}`,
      `Primary Platform: ${form.platform}`,
      `Timeline: ${form.timeline}`,
      form.notes ? `Notes: ${form.notes}` : undefined,
      `Estimated from tool: ${currency(price)}`,
    ].filter(Boolean).join('\n');
    const url = buildWhatsAppLink('New project inquiry:\n' + lines);
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div>
  <p className="subtle">Pick what you need—this creates a quick brief and a ballpark figure. Starter pricing from €250 is applied. We’ll finalize on chat.</p>

      <div className="estimator-grid">
        <div className="block">
          <label className="label">Project Type</label>
          <div className="options">
            {Object.keys(BASES).map(t => (
              <button
                key={t}
                className={t===form.type? 'chip active':'chip'}
                onClick={() => updateType(t)}
                aria-pressed={t===form.type}
              >{t}</button>
            ))}
          </div>
        </div>

        {form.type !== 'Landing Page' && (
          <div className="block">
            <label className="label">Pages</label>
            <input
              type="range" min="3" max="10" value={form.pages}
              onChange={e => update('pages', Number(e.target.value))}
              aria-label="Number of pages"
            />
            <div className="hint">{form.pages} pages</div>
          </div>
        )}

        <div className="block">
          <label className="label">Add-ons</label>
          <div className="options wrap">
            <button className={form.cms?'chip active':'chip'} onClick={()=>update('cms', !form.cms)}>CMS</button>
            <button className={form.analytics?'chip active':'chip'} onClick={()=>update('analytics', !form.analytics)}>Analytics</button>
            <button className={form.seo?'chip active':'chip'} onClick={()=>update('seo', !form.seo)}>SEO Basics</button>
            <button className={form.automation?'chip active':'chip'} onClick={()=>update('automation', !form.automation)}>Automation</button>
            <button className={form.contentHelp?'chip active':'chip'} onClick={()=>update('contentHelp', !form.contentHelp)}>Content Help</button>
          </div>
        </div>

        <div className="block">
          <label className="label">Primary Platform</label>
          <div className="options">
            {PLATFORMS.map(p => (
              <button key={p} className={p===form.platform?'chip active':'chip'} onClick={()=>update('platform', p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="block">
          <label className="label">Timeline</label>
          <select value={form.timeline} onChange={e=>update('timeline', e.target.value)} aria-label="Timeline">
            <option>ASAP</option>
            <option>1-2 weeks</option>
            <option>2-3 weeks</option>
            <option>1 month</option>
            <option>No rush</option>
          </select>
        </div>

        <div className="block">
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={e=>update('notes', e.target.value)} rows={3} placeholder="Anything specific? Links, brand, examples..." />
        </div>
      </div>

      <div className="estimator-footer">
        <div className="price">
          <span className="price-label">Ballpark</span>
          <strong className="price-value">{currency(price)}</strong>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={exportWhatsApp}>Send Brief via WhatsApp</button>
          <button
            className="btn btn-outline"
            onClick={() => {
              try { localStorage.removeItem('estimator_form'); } catch {}
              setForm(DEFAULT_STATE);
            }}
          >Reset</button>
        </div>
      </div>
      <div className="disclaimer">Estimates are indicative and may adjust with scope/content. Let’s confirm on chat.</div>
    </div>
  );
}
