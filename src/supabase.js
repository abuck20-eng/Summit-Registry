import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chdgcexnfvggwayiwwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZGdjZXhuZnZnZ3dheWl3d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTQxNzYsImV4cCI6MjA4Nzk3MDE3Nn0.oI1HhhgF6TVo-p0ylm1GtaR1pxCUqkapVZ_8rsBlHh8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
