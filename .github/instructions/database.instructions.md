# Datenbank & Supabase-Edge-Functions

## Sicherheits-Richtlinien (Security First)
- **Keine API-Keys im Frontend:** Secrets und sensitive Schlüssel für Drittanbieter-APIs dürfen niemals im Browser-Code auftauchen.
- **Supabase Edge Functions:** Alle externen API-Anbindungen (DHL, Yahoo, Google APIs etc.) müssen über serverseitige Supabase Edge Functions ausgeführt werden. Das Frontend kommuniziert nur mit Supabase.
- **Row Level Security (RLS):** Jede PostgreSQL-Tabelle **muss** RLS aktiviert haben. Keine Ausnahmen.

## Datenbank-Konventionen (Tabellenschema)
- **Standard-Metadaten:** Jede Tabelle muss folgende Spalten besitzen:
  ```sql
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
  ```
- **Benutzer-Bezug:** Tabellen, die benutzerspezifische Daten speichern, müssen zwingend eine Fremdschlüsselspalte auf die Auth-Tabelle besitzen:
  ```sql
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
  ```
- **RLS-Policies:** Definiere Policies so, dass Benutzer ausschließlich Lese- und Schreibzugriff auf Zeilen erhalten, bei denen `user_id = auth.uid()` gilt.
