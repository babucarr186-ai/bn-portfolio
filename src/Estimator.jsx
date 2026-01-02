import { useMemo, useState } from 'react';

const PROJECT_TYPES = [
  { id: 'landing', label: 'Landing page', baseMin: 250, baseMax: 500 },
  { id: 'portfolio', label: 'Portfolio', baseMin: 300, baseMax: 650 },
  { id: 'business', label: 'Business website', baseMin: 500, baseMax: 1200 },
  { id: 'shop', label: 'Mini shop', baseMin: 900, baseMax: 2200 }
];

const COMPLEXITY = [
  { id: 'simple', label: 'Simple', multiplier: 1.0 },
  { id: 'standard', label: 'Standard', multiplier: 1.25 },
  { id: 'advanced', label: 'Advanced', multiplier: 1.6 }
];

const TIMELINE = [
  { id: 'flexible', label: 'Flexible', multiplier: 1.0 },
  { id: '2-4w', label: '2–4 weeks', multiplier: 1.15 },
  { id: 'asap', label: 'ASAP', multiplier: 1.3 }
];

const ADD_ONS = [
  { id: 'seo', label: 'SEO basics', addMin: 80, addMax: 180 },
  { id: 'analytics', label: 'Analytics setup', addMin: 40, addMax: 120 },
  { id: 'content', label: 'Content setup (copy/layout)', addMin: 120, addMax: 320 },
  { id: 'automation', label: 'Simple automation (forms → sheets)', addMin: 120, addMax: 450 }
];

function roundToNearest(value, step) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / step) * step;
}

function formatNumber(value) {
  return value.toLocaleString();
}

export default function Estimator() {
  const [projectTypeId, setProjectTypeId] = useState(PROJECT_TYPES[0].id);
  const [complexityId, setComplexityId] = useState(COMPLEXITY[1].id);
  const [timelineId, setTimelineId] = useState(TIMELINE[0].id);
  const [addons, setAddons] = useState(() => new Set());

  const result = useMemo(() => {
    const project = PROJECT_TYPES.find(p => p.id === projectTypeId) || PROJECT_TYPES[0];
    const comp = COMPLEXITY.find(c => c.id === complexityId) || COMPLEXITY[0];
    const tl = TIMELINE.find(t => t.id === timelineId) || TIMELINE[0];

    let min = project.baseMin;
    let max = project.baseMax;

    for (const add of ADD_ONS) {
      if (addons.has(add.id)) {
        min += add.addMin;
        max += add.addMax;
      }
    }

    min *= comp.multiplier * tl.multiplier;
    max *= comp.multiplier * tl.multiplier;

    const roundedMin = roundToNearest(min, 25);
    const roundedMax = roundToNearest(max, 25);

    const safeMin = Math.min(roundedMin, roundedMax);
    const safeMax = Math.max(roundedMin, roundedMax);

    return {
      min: safeMin,
      max: safeMax,
      label: `${formatNumber(safeMin)} – ${formatNumber(safeMax)}`
    };
  }, [addons, complexityId, projectTypeId, timelineId]);

  function toggleAddon(id) {
    setAddons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="card estimator" aria-labelledby="estimator-title">
      <h2 id="estimator-title">Ballpark Estimate</h2>
      <p className="muted">
        Quick rough range to help you plan. Final scope can adjust after a short chat.
      </p>

      <div className="estimator-grid" role="form" aria-label="Ballpark estimate form">
        <label className="field">
          <span className="field-label">Project type</span>
          <select value={projectTypeId} onChange={e => setProjectTypeId(e.target.value)} className="field-control" aria-label="Project type">
            {PROJECT_TYPES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Complexity</span>
          <select value={complexityId} onChange={e => setComplexityId(e.target.value)} className="field-control" aria-label="Complexity">
            {COMPLEXITY.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Timeline</span>
          <select value={timelineId} onChange={e => setTimelineId(e.target.value)} className="field-control" aria-label="Timeline">
            {TIMELINE.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="estimator-addons" aria-label="Add-ons">
        {ADD_ONS.map(a => (
          <label key={a.id} className="addon">
            <input
              type="checkbox"
              checked={addons.has(a.id)}
              onChange={() => toggleAddon(a.id)}
              aria-label={a.label}
            />
            <span>{a.label}</span>
          </label>
        ))}
      </div>

      <div className="estimator-result" role="status" aria-label="Estimate result">
        <div className="estimator-result-label">Estimated range</div>
        <div className="estimator-result-value">{result.label}</div>
      </div>
    </section>
  );
}
