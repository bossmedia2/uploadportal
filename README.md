# Upload-Portal

Einfache Seite für Kund:innen, um Bilder oder eine ZIP-Datei hochzuladen.
Die Dateien landen direkt im Ordner `uploads/` auf deinem Rechner.

## Einmalig einrichten

```bash
cd upload-portal
npm install
```

## Empfohlen: Produktionsmodus (ein Link, kein CORS-Ärger)

Baue das Frontend einmal und starte danach nur noch den Server - er liefert
sowohl die Seite als auch die Upload-Funktion über **einen einzigen Port**.

```bash
npm run build
npm run start
```

Der Server läuft jetzt auf Port `3001` und lauscht auf allen Netzwerk-
schnittstellen (auch deiner Tailscale-IP).

Deine Tailscale-IP findest du z. B. mit:

```bash
tailscale ip -4
```

Den Link, den du deiner Kundin schickst:

```
http://<deine-tailscale-ip>:3001
```

Sobald sie Dateien hochlädt, erscheinen sie live im Terminal-Log und landen
in `upload-portal/uploads/`.

## Alternative: Dev-Modus (für schnelles Ändern am Design)

Zwei Terminals parallel:

```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend mit Hot-Reload
npm run dev
```

Vite läuft dann auf Port `5173` und leitet `/api`-Aufrufe automatisch an
Port `3001` weiter (siehe `vite.config.js`). Der Link für die Kundin wäre
in diesem Modus `http://<deine-tailscale-ip>:5173`.

## Anpassen

- **Erlaubte Dateitypen / Größenlimit:** in `server.js` (`ACCEPTED`,
  `MAX_SIZE_MB`) und in `src/App.jsx` (`ACCEPTED_EXT`, `MAX_SIZE_MB`)
  jeweils gleich einstellen.
- **Zielordner:** `UPLOAD_DIR` in `server.js`.
- **Texte/Design:** `src/App.jsx` und `src/App.css`.

## Hinweis zu Tailscale

Der Server bindet an `0.0.0.0`, ist also im gesamten Tailnet erreichbar,
nicht nur lokal. Falls du den Zugriff auf bestimmte Geräte beschränken
willst, kannst du das über Tailscale ACLs regeln statt über den Server
selbst.
