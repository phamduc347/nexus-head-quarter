# Git-Workflow & Commit-Berechtigungen

## Arbeitsablauf & Tool-Interaktion
- Nutze für alle Terminal- und Git-Aktionen stets die integrierten Command-Execution-Tools.
- Falls Standardbefehle (wie `git`) fehlschlagen oder Pfadkonflikte auftreten, nutze `which <befehl>`, um den absoluten Pfad des Programms zu ermitteln und verwende diesen.

## Befehls-Formatierung
- Gib Befehle immer als einzelne, direkt ausführbare und kopierbare Zeilen aus.
- Keine Verkettungen (z. B. `git add . && git commit`), um Fehleranalyse und manuelle Ausführung zu vereinfachen.

## Commits & Branches
- Commits sollten prägnant formuliert sein (z. B. `feat: add quicklinks widget`, `fix: rls policies for notes`).
- Hauptentwicklungs-Branch ist `main`.
