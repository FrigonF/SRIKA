import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqbnqtlspgymldufwehg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYm5xdGxzcGd5bWxkdWZ3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDQ3MzAsImV4cCI6MjA4NDg4MDczMH0.E-JhY-j0odXyM-Vq1stPQSYKJsVNzEzWtb43KBt5HzU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: false, // Rely purely on our custom safeStorage in AuthManager
        detectSessionInUrl: false
    }
});
