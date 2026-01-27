
-- 1. Create the 'tasks' table
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

-- 2. Create the 'emergencies' table
CREATE TABLE IF NOT EXISTS public.emergencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    text TEXT NOT NULL
);

-- 3. Create the 'welcome_tasks' table
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies Safely (Idempotent - checks if they exist before creating)
DO $$
BEGIN
    -- Tasks Table Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon select on tasks') THEN
        CREATE POLICY "Allow anon select on tasks" ON public.tasks FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon insert on tasks') THEN
        CREATE POLICY "Allow anon insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon update on tasks') THEN
        CREATE POLICY "Allow anon update on tasks" ON public.tasks FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon delete on tasks') THEN
        CREATE POLICY "Allow anon delete on tasks" ON public.tasks FOR DELETE USING (true);
    END IF;

    -- Emergencies Table Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon select on emergencies') THEN
        CREATE POLICY "Allow anon select on emergencies" ON public.emergencies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon insert on emergencies') THEN
        CREATE POLICY "Allow anon insert on emergencies" ON public.emergencies FOR INSERT WITH CHECK (true);
    END IF;

    -- Welcome Tasks Table Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon select on welcome_tasks') THEN
        CREATE POLICY "Allow anon select on welcome_tasks" ON public.welcome_tasks FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon insert on welcome_tasks') THEN
        CREATE POLICY "Allow anon insert on welcome_tasks" ON public.welcome_tasks FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon update on welcome_tasks') THEN
        CREATE POLICY "Allow anon update on welcome_tasks" ON public.welcome_tasks FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon delete on welcome_tasks') THEN
        CREATE POLICY "Allow anon delete on welcome_tasks" ON public.welcome_tasks FOR DELETE USING (true);
    END IF;
END
$$;

-- 6. Enable Realtime (Non-destructive check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN others THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
    EXCEPTION WHEN others THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.welcome_tasks;
    EXCEPTION WHEN others THEN END;
END
$$;
