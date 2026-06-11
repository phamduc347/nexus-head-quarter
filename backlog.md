# Nexus HQ — Feature Backlog & Ideen-Speicher

Dieses Dokument dient als zentrale Sammelstelle für alle geplanten Features, Konzepte und technische Schulden. Die Aufgaben sind nach Themenbereichen sortiert und priorisiert.

---

## 🏗️ Core & System (Phase 1)

- [ ] **Sicheres Login (Auth)**
  - *Beschreibung:* Login-Maske via Supabase Auth (E-Mail/Password und optional Magic Link).
  - *Details:* Schützen aller Dashboard-Routen. RLS Policies in Supabase greifen erst nach Login.
- [ ] **Widget Shell & Drag-and-Drop Grid**
  - *Beschreibung:* Ein flexibles Grid-System (mobile-first), in dem Widgets verschoben und verkleinert/vergrößert werden können.
  - *Details:* Widget-Layout (Position, Sichtbarkeit) muss persistent in der DB-Tabelle `widget_layout` gespeichert werden.
- [ ] **Generischer Webhook-Link**
  - *Beschreibung:* Vorbereiten einer Supabase Edge Function, die beliebige JSON-Payloads via POST empfängt und in die DB (`webhook_events`) schreibt.
  - *Details:* Ermöglicht die spätere Anbindung externer Trigger (z. B. n8n, IFTTT, Zapier).

---

## 🛠️ Produktivitäts-Widgets (Phase 1 & 2)

- [ ] **Quicklinks**
  - *Beschreibung:* Widget mit kachelbaren Verlinkungen auf häufig genutzte Webseiten.
  - *Details:* Einträge müssen über Buttons im UI hinzugefügt und gelöscht werden können (CRUD auf `quicklinks` Tabelle).
- [ ] **Notizen (Notes)**
  - *Beschreibung:* Editor für schnelle Textnotizen im Markdown-Format.
  - *Details:* Speicherung der Notizen in `notes` Tabelle (CRUD-Funktionalität, automatische Speicherung).
- [ ] **Wetter Dashboard (Dresden)**
  - *Beschreibung:* Lokales Wetter-Widget mit aktueller Temperatur und Vorhersage.
  - *Details:* Kostenlose Open-Meteo API nutzen (kein API-Key erforderlich). Mobile-optimierte Darstellung.

---

## 📅 Integrationen & Timeline (Phase 2 & 3)

- [ ] **Google Calendar Anbindung**
  - *Beschreibung:* Eigene Termine direkt auf dem Dashboard anzeigen.
  - *Details:* OAuth-Flow über Supabase einrichten, um Termine sicher aus der Google Calendar API zu fetchen.
- [ ] **iCal Anbindung**
  - *Beschreibung:* Einlesen von externen Kalender-Feeds (z. B. Apple iCal, Feiertage).
  - *Details:* URL-Input im Widget, Parsen mittels JS-Bibliothek (`ical.js`), Caching der Events in DB.
- [ ] **Life Timeline**
  - *Beschreibung:* Visuelle Zeitleiste der nächsten Wochen/Monate (Events, Tasks, Geburtstage).
  - *Details:* Aggregiert Daten aus Google Calendar, iCal und manuell gesetzten Milestones.

---

## 🌐 Fortgeschrittene Integrationen & Automatisierung (Phase 3 & 4)

- [ ] **Google Drive Integration (Auto-Archivierung)**
  - *Beschreibung:* Dateien hochladen, automatisch nach Regeln benennen (z. B. "Rechnung_Datum.pdf") und in entsprechenden Google-Drive-Ordnern ablegen.
  - *Details:* OAuth scope für Drive API, eventuell Backend-Klassifizierung oder OCR.
- [ ] **DHL Paket-Tracking**
  - *Beschreibung:* Sendungsverfolgung im Hintergrund für DHL-Pakete.
  - *Details:* Cron-Job in Supabase Edge Functions pollt Tracking-API und sendet Benachrichtigung oder aktualisiert Widget.
- [ ] **Yahoo Anbindung**
  - *Beschreibung:* Einbindung von Yahoo-Diensten (Mail/Finance).
  - *Details:* Klärung, ob IMAP-Mailabfrage oder Aktien-Tracker benötigt wird.
- [ ] **Google API Kosten-Übersicht**
  - *Beschreibung:* Widget, das die aktuellen Kosten der Google Cloud APIs anzeigt.
  - *Details:* Abfrage der Google Cloud Billing API via Service-Account-Integration.

---

## 🔍 Suche & Optimierungen (Phase 3+)

- [ ] **Universal Search**
  - *Beschreibung:* Eine globale Suchleiste im Dashboard-Header, die alle Widgets durchsucht.
  - *Details:* Nutzt PostgreSQL Full-Text-Search über `notes`, `quicklinks` und Kalender-Caches.
- [ ] **Light / Dark Mode**
  - *Beschreibung:* Umschaltbares Farbthema basierend auf den System-Präferenzen oder manuellem Switch.
  - *Details:* Entsprechend den Richtlinien in `frontend.instructions.md`.
