import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Zielordner für hochgeladene Dateien - anpassen, falls du sie woanders haben willst.
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ACCEPTED = new Set(['.zip', '.jpg', '.jpeg', '.png', '.webp', '.heic']);
const MAX_SIZE_MB = 500;

function safeName(originalName) {
  // Entfernt Pfadanteile und Sonderzeichen, behält Endung.
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 80);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${stamp}--${base}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, safeName(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ACCEPTED.has(ext)) return cb(new Error('Dateityp nicht erlaubt'));
    cb(null, true);
  },
});

const app = express();
app.use(cors());

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Upload-Fehler:', err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten' });
    console.log(`✔ empfangen: ${req.file.filename} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
    res.json({ ok: true, filename: req.file.filename });
  });
});

// Im Produktionsmodus (nach "npm run build") liefert dieser selbe Server auch
// gleich das fertige Frontend aus - dann reicht EIN Link (http://<tailscale-ip>:3001).
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Upload-Server läuft auf Port ${PORT}`);
  console.log(`Dateien landen in: ${UPLOAD_DIR}`);
});
