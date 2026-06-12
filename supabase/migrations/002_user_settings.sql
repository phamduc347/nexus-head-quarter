-- Tabelle für allgemeine Benutzereinstellungen
CREATE TABLE public.user_settings (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS aktivieren
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (User darf nur eigene Einstellungen lesen/schreiben)
CREATE POLICY "Select own settings" ON public.user_settings 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Insert own settings" ON public.user_settings 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own settings" ON public.user_settings 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
