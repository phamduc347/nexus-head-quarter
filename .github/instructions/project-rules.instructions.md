# Projekt-Richtlinien, Code-Style & Grundlegender Workflow

## Geltungsbereich
- Diese Richtlinien gelten für alle Entwicklungsaktivitäten im Repository.
- Sie dienen als Leitfaden für Code-Struktur, Namenskonventionen und allgemeine Code-Qualität.

## Globale Kommunikationsregeln
- Antworte präzise, direkt und umsetzungsorientiert.
- Nenne bei Änderungen betroffene Dateien und erkläre deren Auswirkungen.
- Gib Git-Commit-Vorschläge immer als kopierbaren Einzeiler (inklusive `git add`, `git commit` and `git push` verkettet mit `&&`) aus.

## Code-Style & Modularität
- **Modularer Aufbau:** Widgets leben in `src/widgets/<widget-name>/`.
- **Kapselung:** Ein Widget ist in sich geschlossen und bringt seine eigene Logik (`index.js`) und sein eigenes Styling (`styles.css`) mit.
- **Wiederverwendbarkeit:** Globale Hilfsfunktionen (Utilities) oder Datenbank-Clients werden zentral in `src/lib/` abgelegt und von dort importiert.
- Nutze konsistente Namensgebung.
- Halte Funktionen klein und klar.
- Erklaere nur komplexe Logik mit kurzen Kommentaren.
- Bevorzuge kleine, nachvollziehbare Aenderungen.
- Vermeide unnoetige Refactors ohne fachlichen Mehrwert.
- Halte bestehende Muster des Repos ein.
- Aendere keine externen Schnittstellen ohne Hinweis.
- Aktualisiere Doku, wenn Verhalten sich aendert.

## Sicherheit
- Niemals Secrets, Tokens oder Passwoerter committen.
- Im Frontend nur oeffentliche Schluessel (z. B. Supabase anon key) verwenden.

## Tests & Qualitätssicherung
- Aendere produktiven Code nur mit passender Validierung.
- Führe vor jedem Commit zwingend die run_tests.sh aus.
- Priorisiere das Aktualisieren von Tests gegenüber dem Löschen. Ziel ist eine hohe Test-Coverage.
- Dokumentiere bekannte Risiken kurz im PR/Commit.

## (WICHTIG!) Grundlegender Workflow bei neuer oder geänderte Funktionalität und/oder UI Elementen
1. **Funktion prüfen:** Bevor eine neue Funktion implementiert wird, muss im Code überprüft werden, ob es für diese Funktion bereits eine ähnliche Implementierung an anderer Stelle gibt. Ziel ist es, vorhandene Muster und Bibliotheken zu nutzen, um Redundanzen zu vermeiden und Konsistenz zu gewährleisten.
2. **UI-Komponenten erstellen:** Falls keine passende UI-Komponente existiert, muss im Verzeichnis `ui/components` eine neue erstellt werden. Neue UI-Komponenten müssen in der Datei `ui/main.js` integriert werden, um die maximale Kompatibilität und Funktionalität sicherzustellen.
3. **Testing:** Nach der Implementierung der Funktion muss sichergestellt werden, dass ein entsprechender Test case dafür existiert. Falls nicht, muss ein Test case erstellt werden. Falls eine Funktion geändert wird, dürfen die Testerwartungen niemals automatisch angepasst werden, sondern müssen vom User reviewed werden. Bei FAILED tests, muss entweder die Funktion an die Testerwartung angepasst oder die Testerwartung an die Funktion angepasst werden (nach Absprache mit User).
4. **Deployment & Commits:** Nach erfolgreichen Tests muss dem User eine kurze Zusammenfassung der Änderungen gegeben werden. Falls der User manuelle Änderungen im workspace vornimmt, sollen diese auch dokumentiert und erläutert werden. Was wurde geändert und warum. Kurz und prägnant. **Der Commit-Befehl darf vom Agenten erst nach expliziter Freigabe durch den User vorgeschlagen und ausgeführt werden. Supabase Edge Functions dürfen niemals eigenständig vom Agenten deployed werden (muss durch den User erfolgen).**

