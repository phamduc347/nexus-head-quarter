-- Initiales Datenbankschema für Nexus HQ

-- 1. Tabellen-Erstellung

-- Tabelle für das Widget-Layout (Position, Größe, Zustand der Container)
CREATE TABLE public.widget_layout (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    widget_id text NOT NULL,
    title text NOT NULL,
    col_span integer DEFAULT 1 NOT NULL,
    row_span integer DEFAULT 1 NOT NULL,
    position_x integer DEFAULT 0 NOT NULL,
    position_y integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, widget_id)
);

-- Tabelle für Quicklinks
CREATE TABLE public.quicklinks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabelle für Notizen
CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text,
    content text DEFAULT '' NOT NULL,
    color text DEFAULT '#ffffff',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. RLS (Row Level Security) aktivieren
ALTER TABLE public.widget_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quicklinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 3. RLS-Policies anlegen (Jeder User sieht/ändert nur seine eigenen Daten)

-- Policies für widget_layout
CREATE POLICY "Select own layout" ON public.widget_layout 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Insert own layout" ON public.widget_layout 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own layout" ON public.widget_layout 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own layout" ON public.widget_layout 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies für quicklinks
CREATE POLICY "Select own quicklinks" ON public.quicklinks 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Insert own quicklinks" ON public.quicklinks 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own quicklinks" ON public.quicklinks 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own quicklinks" ON public.quicklinks 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies für notes
CREATE POLICY "Select own notes" ON public.notes 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Insert own notes" ON public.notes 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own notes" ON public.notes 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own notes" ON public.notes 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
