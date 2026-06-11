# AGENTS.md — Nexus HQ Guidelines

## Geltungsbereich
- Diese Regeln gelten für alle Agenten im Workspace (z. B. Copilot, Antigravity, Gemini, Claude).

## Wichtig: Single Source of Truth
Alle fachlichen, technischen und organisatorischen Verhaltensregeln sind in den entsprechenden Instruktionsdateien im Verzeichnis `.github/instructions/` definiert. Diese müssen zwingend beachtet und angewendet werden:

- **Projekt-Richtlinien, Code-Style & Grundlegender Workflow:**
  Siehe [.github/instructions/project-rules.instructions.md](./.github/instructions/project-rules.instructions.md)
- **Git-Workflow & Commit-Berechtigungen:**
  Siehe [.github/instructions/git-workflow.instructions.md](./.github/instructions/git-workflow.instructions.md)
- **Frontend- & UI-Entwicklung:**
  Siehe [.github/instructions/frontend.instructions.md](./.github/instructions/frontend.instructions.md)
- **Datenbank & Supabase-Edge-Functions:**
  Siehe [.github/instructions/database.instructions.md](./.github/instructions/database.instructions.md)
- **Deployment-Regeln:**
  Siehe [.github/instructions/deployment.instructions.md](./.github/instructions/deployment.instructions.md)

---

## High-Level Anforderungen

### 1. Kommunikation & Tool-Interaktion
- Antworte präzise, umsetzungsorientiert und liefere kopierbare Einzelbefehle.
- Nutze `run_command` pragmatisch und weiche bei Fehlern auf absolute Pfade aus.
- *Details siehe:* [git-workflow.instructions.md](./.github/instructions/git-workflow.instructions.md) & [project-rules.instructions.md](./.github/instructions/project-rules.instructions.md)

### 2. Sicherheit & API-Verbindungen
- **Security First:** Keine Secrets/API-Keys im Frontend.
- Externe APIs zwingend über Supabase Edge Functions ansprechen.
- *Details siehe:* [database.instructions.md](./.github/instructions/database.instructions.md)

### 3. Frontend & Layout
- Mobile-First Design verpflichtend.
- Modulare Widgets gekapselt unter `src/widgets/<widget-name>/`.
- *Details siehe:* [frontend.instructions.md](./.github/instructions/frontend.instructions.md)

### 4. Datenbank-Struktur & RLS
- Jede Tabelle erfordert ID/Metadaten, User-Bezug und aktivierte Row Level Security (RLS).
- *Details siehe:* [database.instructions.md](./.github/instructions/database.instructions.md)
