import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// Auto-discover images added to src/assets/portfolio (just drop files there and commit)
const discovered = import.meta.glob('/src/assets/portfolio/**/*.{png,jpg,jpeg,webp,gif,svg}', {
  eager: true,
  import: 'default',
});

function useDiscoveredImages() {
  return useMemo(() => {
    const list = Object.entries(discovered).map(([path, url]) => ({
      path,
      url,
      name: path.split('/').pop() || 'image',
      source: 'repo',
    }));
    // Sort newest first by name (filenames with dates will float up)
    list.sort((a, b) => a.name.localeCompare(b.name)).reverse();
    return list;
  }, []);
}

const LS_EXTERNAL = 'gallery_external_urls';
const LS_LOCAL = 'gallery_local_data';

export default function Gallery() {
  const repoImages = useDiscoveredImages();
  const [external, setExternal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_EXTERNAL) || '[]'); } catch { return []; }
  });
  const [localData, setLocalData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_LOCAL) || '[]'); } catch { return []; }
  });
  const [urlInput, setUrlInput] = useState('');
  const dropRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(LS_EXTERNAL, JSON.stringify(external)); } catch {}
  }, [external]);
  useEffect(() => {
    try { localStorage.setItem(LS_LOCAL, JSON.stringify(localData)); } catch {}
  }, [localData]);

  const items = useMemo(() => {
    const ext = external.map((u, i) => ({ url: u.url, name: u.title || `external-${i+1}`, source: 'url' }));
    const loc = localData.map((d, i) => ({ url: d.dataUrl, name: d.name || `local-${i+1}`, source: 'local' }));
    return [...ext, ...repoImages, ...loc];
  }, [external, repoImages, localData]);

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    setExternal(prev => [{ url: u, title: u.split('/').pop() }, ...prev]);
    setUrlInput('');
  }

  function onDrop(ev) {
    ev.preventDefault();
    const files = Array.from(ev.dataTransfer.files || []);
    if (!files.length) return;
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        // Warn: local-only; for publishing, commit files to src/assets/portfolio
        setLocalData(prev => [{ dataUrl, name: file.name }, ...prev].slice(0, 50));
      };
      // Size gate ~1.5MB to avoid exhausting storage
      if (file.size <= 1.5 * 1024 * 1024) reader.readAsDataURL(file);
    });
  }

  function onDragOver(ev) { ev.preventDefault(); }

  return (
    <section className="card" aria-labelledby="gallery-title">
      <h2 id="gallery-title">Portfolio Gallery</h2>
      <p className="subtle">Drop image files here (for local preview), paste an image URL, or commit images into <code>src/assets/portfolio</code> to include them automatically on the live site.</p>

      <div
        ref={dropRef}
        className="gallery-drop"
        onDrop={onDrop}
        onDragOver={onDragOver}
        aria-label="Drop images here to preview"
      >
        <div className="drop-inner">Drag & drop images here</div>
        <div className="url-add">
          <input
            type="url"
            placeholder="Paste image URL (https://...)"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            aria-label="Image URL"
          />
          <button className="btn" onClick={addUrl} aria-label="Add image URL">Add</button>
        </div>
        <div className="hint-note">Note: Dragged files are stored in your browser only. To publish, add images to <code>src/assets/portfolio</code> and commit.</div>
      </div>

      <div className="gallery-grid" role="list">
        {items.map((it, idx) => (
          <figure key={idx} className="gallery-item" role="listitem">
            <img src={it.url} alt={it.name} loading="lazy" />
            <figcaption>
              <span className="img-name" title={it.name}>{it.name}</span>
              <span className={`badge src-${it.source}`}>{it.source}</span>
            </figcaption>
          </figure>
        ))}
        {items.length === 0 && (
          <div className="empty">No images yet. Drop some files or add URLs, or place images in <code>src/assets/portfolio</code>.</div>
        )}
      </div>
    </section>
  );
}
