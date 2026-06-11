# Projekt-Richtlinien, Code-Style & Grundlegender Workflow

## Geltungsbereich
- Diese Richtlinien gelten für alle Entwicklungsaktivitäten im Repository.
- Sie dienen als Leitfaden für Code-Struktur, Namenskonventionen und allgemeine Code-Qualität.

## Globale Kommunikationsregeln
- Antworte präzise, direkt und umsetzungsorientiert.
- Nenne bei Änderungen betroffene Dateien und erkläre deren Auswirkungen.
- Gib für Terminal-Schritte (z. B. Git) kopierbare Einzelbefehle aus (vermeide Ketten mit `&&` oder `;`).

## Code-Style & Modularität
- **Modularer Aufbau:** Widgets leben in `src/widgets/<widget-name>/`.
- **Kapselung:** Ein Widget ist in sich geschlossen und bringt seine eigene Logik (`index.js`) und sein eigenes Styling (`styles.css`) mit.
- **Wiederverwendbarkeit:** Globale Hilfsfunktionen (Utilities) oder Datenbank-Clients werden zentral in `src/lib/` abgelegt und von dort importiert.
