
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

-- 2. Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_tasks ENABLE ROW LEVEL SECURITY;

-- 3. DROP AND RECREATE POLICIES (This stops the "already exists" error)
-- Tasks
DROP POLICY IF EXISTS "Allow anon select on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow anon insert on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow anon update on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow anon delete on tasks" ON public.tasks;

CREATE POLICY "Allow anon select on tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete on tasks" ON public.tasks FOR DELETE USING (true);

-- Emergencies
DROP POLICY IF EXISTS "Allow anon select on emergencies" ON public.emergencies;
DROP POLICY IF EXISTS "Allow anon insert on emergencies" ON public.emergencies;

CREATE POLICY "Allow anon select on emergencies" ON public.emergencies FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on emergencies" ON public.emergencies FOR INSERT WITH CHECK (true);

-- Welcome Tasks
DROP POLICY IF EXISTS "Allow anon select on welcome_tasks" ON public.welcome_tasks;
DROP POLICY IF EXISTS "Allow anon insert on welcome_tasks" ON public.welcome_tasks;
DROP POLICY IF EXISTS "Allow anon update on welcome_tasks" ON public.welcome_tasks;
DROP POLICY IF EXISTS "Allow anon delete on welcome_tasks" ON public.welcome_tasks;

CREATE POLICY "Allow anon select on welcome_tasks" ON public.welcome_tasks FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on welcome_tasks" ON public.welcome_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on welcome_tasks" ON public.welcome_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete on welcome_tasks" ON public.welcome_tasks FOR DELETE USING (true);

-- 4. Enable Realtime safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Attempt to add tables to publication (ignoring errors if they already exist in it)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.welcome_tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
