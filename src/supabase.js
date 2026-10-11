import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bwewlovaghjngadfszms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3ZXdsb3ZhZ2hqbmdhZGZzem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzA1MDMsImV4cCI6MjEwNzMwNjUwM30.FPlCf-eKQNTFyIRL4jJ6weMNbVnuyjUW5RILr1mG9aE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
