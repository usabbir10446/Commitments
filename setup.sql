
-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date DATE NOT NULL,
    time_block TEXT NOT NULL,
    title TEXT NOT NULL,
    venue TEXT NOT NULL,
    remarks TEXT,
    attended TEXT
);

CREATE TABLE IF NOT EXISTS public.emergencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.welcome_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    top_text TEXT,
    bottom_text_1 TEXT,
    bottom_text_2 TEXT,
    bottom_text_3 TEXT,
    image_data TEXT,
    is_active BOOLEAN DEFAULT false
);

-- 2. Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Reset all Policies to be 100% open for testing/anon access
DO $$ 
BEGIN
    -- Tasks
    DROP POLICY IF EXISTS "Allow anon select on tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow anon insert on tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow anon update on tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow anon delete on tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Public Access Tasks" ON public.tasks;
    
    -- Emergencies
    DROP POLICY IF EXISTS "Allow anon select on emergencies" ON public.emergencies;
    DROP POLICY IF EXISTS "Allow anon insert on emergencies" ON public.emergencies;
    DROP POLICY IF EXISTS "Public Access Emergencies" ON public.emergencies;

    -- Welcome Tasks
    DROP POLICY IF EXISTS "Allow anon select on welcome_tasks" ON public.welcome_tasks;
    DROP POLICY IF EXISTS "Allow anon insert on welcome_tasks" ON public.welcome_tasks;
    DROP POLICY IF EXISTS "Allow anon update on welcome_tasks" ON public.welcome_tasks;
    DROP POLICY IF EXISTS "Allow anon delete on welcome_tasks" ON public.welcome_tasks;
    DROP POLICY IF EXISTS "Public Access Welcome" ON public.welcome_tasks;
END $$;

-- Create wide-open policies (For development/demo ease)
CREATE POLICY "Public Access Tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Emergencies" ON public.emergencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Welcome" ON public.welcome_tasks FOR ALL USING (true) WITH CHECK (true);

-- 4. Set up Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Add tables to realtime publication safely
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.welcome_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
