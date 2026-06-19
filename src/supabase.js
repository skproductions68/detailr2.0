import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://ddekzmmdvlnknhnxdjnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZWt6bW1kdmxua25obnhkam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzgwOTIsImV4cCI6MjA5NzQxNDA5Mn0.YY3rccCjQ2Th_wy5Zm8yI3kJDfc6yU2AX7OYMmWgg5o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
