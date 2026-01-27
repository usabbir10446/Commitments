
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqzyisgohstvzvefvtpe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxenlpc2dvaHN0dnp2ZWZ2dHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MzM1NzMsImV4cCI6MjA4NTEwOTU3M30.C0C9C_re3xrxsMRQERKZLAOrIqcfwxzbS9SWVdKRS20';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
