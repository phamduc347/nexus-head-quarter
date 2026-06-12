# Git-Workflow & Commit-Berechtigungen

## Arbeitsablauf & Tool-Interaktion
- Nutze für alle Terminal- und Git-Aktionen stets die integrierten Command-Execution-Tools.
- Falls Standardbefehle (wie `git`) fehlschlagen oder Pfadkonflikte auftreten, nutze `which <befehl>`, um den absoluten Pfad des Programms zu ermitteln und verwende diesen.

## Befehls-Formatierung
- Gib Befehle immer als einzelne, direkt ausführbare und kopierbare Zeilen aus.
- Git-Commit-Vorschläge müssen immer als zusammenhängender, kopierbarer Einzeiler inklusive `git add`, `git commit` und `git push` (verkettet mit `&&`) zurückgegeben werden, damit der User diese auf einmal im Terminal ausführen kann.

## Commits & Branches
- Hauptentwicklungs-Branch ist `main`.
- Vor jedem Commit und push prüfe ob die Änderungen mit den getätigten Aufgaben übereinstimmen. Fall nicht gib dem User eine Rückmeldung. Ausnahme sind manuelle Änderungen des Users bezüglich strings und texte im Frontend. Diese dürfen vom LLM nicht zurückgeändert werden.
- Nutze Commit-Praefixe wie feat:, fix:, docs:, chore:, deploy:.
- Nutze das deploy: Präfix ausschließlich nach expliziter Aufforderung durch den User.
- Halte Commits klein und fachlich fokussiert.
- Schreibe Commit-Messages mit klarer Wirkung fuer den Nutzer.
- Fuehre vor Merge einen kurzen Selbst-Review durch.
- Git-Befehler können als Einzeiler oder im Batch gegeben werden.
- Stelle sicher, dass alle technischen Änderungen (Dateien schreiben/ändern) abgeschlossen sind, bevor ein Commit-Befehl vorgeschlagen wird.
- Eigenständige commits dürfen nach einer Erlaubnis nur ein mal pro commit durchgeführt werden. Danach darf das LLM keine weiteren commits durchführen ohne eine erneute Erlaubnis.
