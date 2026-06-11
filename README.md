# Nexus HQ — Personal Dashboard

Ein modulares, privat gehostetes Dashboard für persönliche Organisation. Gehostet auf GitHub Pages mit einem robusten Supabase-Backend.

## Systemarchitektur

Das Projekt nutzt einen modernen, schlanken Stack für maximale Unabhängigkeit und minimale Kosten:
- **Frontend:** Statische Single Page Application (SPA), bereitgestellt über GitHub Pages.
- **Backend:** Supabase (Auth, PostgreSQL-Datenbank, Realtime, Edge Functions).
- **APIs & Crons:** Supabase Edge Functions übernehmen alle API-Integrationen und Hintergrund-Jobs, um Secrets sicher zu verwahren.

## Features

- **Sicheres Login:** Supabase Auth (E-Mail/Passwort oder Magic Link).
- **Flexibles Widget-Grid:** Mobile-first, verschiebbare Widget-Container.
- **Produktivitäts-Widgets:** Quicklinks, Notizen-Funktion.
- **Daten & Infos:** Kalender-Integrationen (Google, iCal), Wetter (Dresden), RSS AI Trends.
- **Power Features:** Universal Search, Webhook-Empfänger, Google Drive Auto-Archivierung.

## Setup & Lokale Entwicklung

1. Repository klonen
2. Abhängigkeiten installieren: `npm install`
3. `.env` erstellen basierend auf `.env.example` und Supabase API-Keys eintragen
4. Entwicklungsserver starten: `npm run dev` (Vite)
