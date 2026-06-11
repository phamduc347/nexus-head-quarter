# Deployment-Regeln

## Hosting & CI/CD
- **Frontend-Hosting:** Das Frontend wird als statische Web-App (Single Page Application) über GitHub Pages bereitgestellt.
- **Automatisierung:** Jedes Push-Event auf dem `main` Branch triggert den GitHub Actions Workflow `.github/workflows/deploy.yml`, welcher die Anwendung baut und bereitstellt.

## Secrets & Umgebungsvariablen
- Konfiguriere sensible Variablen (z. B. `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`) in den GitHub Repository Secrets under **Settings → Secrets and Variables → Actions**.
- Lokale Konfigurationen erfolgen ausschließlich über eine nicht committete `.env` Datei (Nutze `.env.example` als Vorlage).
