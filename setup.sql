
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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies Safely (Idempotent - checks if they exist before creating)
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
END
$$;

-- 5. Enable Realtime (Non-destructive check)
-- This ensures the tables are added to the realtime publication.
DO $$
BEGIN
    -- Ensure the publication exists first
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Safely add tables to the publication
    -- This uses a dynamic SQL approach to avoid syntax errors if already added
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN others THEN
        -- Table might already be in publication
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
    EXCEPTION WHEN others THEN
        -- Table might already be in publication
    END;
END
$$;
