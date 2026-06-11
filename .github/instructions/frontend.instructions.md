# Frontend- & UI-Entwicklung

## Mobile First Prinzip
- **Grundregel:** Layouts und CSS müssen primär für mobile Endgeräte (Smartphones) konzipiert und optimiert sein.
- **CSS-Reihenfolge:** 
  1. Allgemeine & Standard-Styles (Mobile) direkt im CSS-Block definieren.
  2. Desktop- und Tablet-Anpassungen ausschließlich über Media-Queries abdecken:
     ```css
     @media (min-width: 768px) {
         /* Desktop / Tablet Anpassungen */
     }
     ```

## Widget-Architektur & Styling
- Widgets müssen vollkommen gekapselt in `src/widgets/<widget-name>/` liegen.
- Jedes Widget bringt seine eigene Logik in `index.js` und sein Styling in `styles.css` mit.
- Verwende generische Container-Strukturen, um Drag-and-Drop / Verschiebbarkeit zu gewährleisten.
- Widgets dürfen keine globalen Styles manipulieren. Verwende spezifische CSS-Klassen (z. B. `.widget-quicklinks`).
