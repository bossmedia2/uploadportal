import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileArchive, Image as ImageIcon, Check, X, AlertTriangle } from 'lucide-react';

const ACCEPTED_EXT = ['.zip', '.jpg', '.jpeg', '.png', '.webp', '.heic'];
const MAX_SIZE_MB = 500;

function isAccepted(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Lädt eine einzelne Datei per XHR hoch (damit wir echten Fortschritt bekommen -
// fetch() unterstützt keinen Upload-Progress).
function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Server antwortete mit ${xhr.status}`));
    });

    xhr.addEventListener('error', () => reject(new Error('Netzwerkfehler')));

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

export default function App() {
  const [queue, setQueue] = useState([]); // { id, file, progress, status, error }
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const idCounter = useRef(0);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList);
    const items = incoming.map((file) => {
      idCounter.current += 1;
      const accepted = isAccepted(file);
      const tooBig = file.size > MAX_SIZE_MB * 1024 * 1024;
      return {
        id: idCounter.current,
        file,
        progress: 0,
        status: !accepted ? 'rejected-type' : tooBig ? 'rejected-size' : 'pending',
        error: null,
      };
    });
    setQueue((prev) => [...prev, ...items]);
  }, []);

  const startUploads = useCallback((items) => {
    items
      .filter((it) => it.status === 'pending')
      .forEach((it) => {
        setQueue((prev) => prev.map((q) => (q.id === it.id ? { ...q, status: 'uploading' } : q)));
        uploadFile(it.file, (pct) => {
          setQueue((prev) => prev.map((q) => (q.id === it.id ? { ...q, progress: pct } : q)));
        })
          .then(() => {
            setQueue((prev) => prev.map((q) => (q.id === it.id ? { ...q, status: 'done', progress: 100 } : q)));
          })
          .catch((err) => {
            setQueue((prev) =>
              prev.map((q) => (q.id === it.id ? { ...q, status: 'error', error: err.message } : q))
            );
          });
      });
  }, []);

  const handleFiles = useCallback(
    (fileList) => {
      idCounter.current += 0; // no-op, keeps linter calm
      const before = queue.length;
      addFiles(fileList);
      // startUploads braucht die *neuen* Items mit finalen IDs - daher im nächsten Tick
      setTimeout(() => {
        setQueue((prev) => {
          const toStart = prev.slice(before);
          startUploads(toStart);
          return prev;
        });
      }, 0);
    },
    [addFiles, startUploads, queue.length]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const onInputChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeItem = (id) => setQueue((prev) => prev.filter((q) => q.id !== id));

  const hasActive = queue.some((q) => q.status === 'uploading' || q.status === 'pending');
  const doneCount = queue.filter((q) => q.status === 'done').length;

  return (
    <div className="page">
      <div className="wrap">
        <header className="head">
          <span className="mark" aria-hidden="true" />
          <div>
            <h1>Dateien hochladen</h1>
            <p>Bilder oder ein ZIP-Archiv per Klick oder Drag &amp; Drop übertragen.</p>
          </div>
        </header>

        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXT.join(',')}
            onChange={onInputChange}
            hidden
          />
          <UploadCloud size={40} strokeWidth={1.5} />
          <p className="dz-main">Dateien hierher ziehen oder klicken zum Auswählen</p>
          <p className="dz-hint">ZIP, JPG, PNG, WebP, HEIC · bis {MAX_SIZE_MB} MB pro Datei</p>
        </div>

        {queue.length > 0 && (
          <ul className="queue">
            {queue.map((item) => (
              <li key={item.id} className={`row row-${item.status}`}>
                <span className="row-icon">
                  {item.file.name.toLowerCase().endsWith('.zip') ? (
                    <FileArchive size={20} strokeWidth={1.5} />
                  ) : (
                    <ImageIcon size={20} strokeWidth={1.5} />
                  )}
                </span>

                <span className="row-name" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="row-size">{formatSize(item.file.size)}</span>

                <span className="row-status">
                  {item.status === 'pending' && <span className="tag">wartet</span>}
                  {item.status === 'uploading' && (
                    <span className="bar">
                      <span className="bar-fill" style={{ width: `${item.progress}%` }} />
                      <span className="bar-pct">{item.progress}%</span>
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="tag tag-ok">
                      <Check size={14} /> hochgeladen
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="tag tag-err">
                      <AlertTriangle size={14} /> fehlgeschlagen
                    </span>
                  )}
                  {item.status === 'rejected-type' && (
                    <span className="tag tag-err">
                      <AlertTriangle size={14} /> falscher Dateityp
                    </span>
                  )}
                  {item.status === 'rejected-size' && (
                    <span className="tag tag-err">
                      <AlertTriangle size={14} /> zu groß
                    </span>
                  )}
                </span>

                {(item.status === 'pending' ||
                  item.status === 'error' ||
                  item.status === 'rejected-type' ||
                  item.status === 'rejected-size') && (
                  <button className="row-remove" onClick={() => removeItem(item.id)} aria-label="Entfernen">
                    <X size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {queue.length > 0 && !hasActive && (
          <p className="summary">
            {doneCount} von {queue.length} Datei{queue.length === 1 ? '' : 'en'} erfolgreich übertragen.
          </p>
        )}
      </div>
    </div>
  );
}
