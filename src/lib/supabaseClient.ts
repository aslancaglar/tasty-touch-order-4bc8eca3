
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

const SUPABASE_URL = "https://yifimiqeybttmbhuplaq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZmltaXFleWJ0dG1iaHVwbGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MDYwNjYsImV4cCI6MjA1OTk4MjA2Nn0.LoMhbECAQxEuf3o35XbFmps5v1-iZ4JieXstrsmylYU";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
