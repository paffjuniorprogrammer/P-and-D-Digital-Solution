// Initialize Supabase Client
const supabaseUrl = 'https://qizmvaqpgwrxwpzrhrmm.supabase.co';
const supabaseKey = 'sb_publishable_JmcTBT912FeSyjQDk9UsrQ_BRVOPRT1';

// UMD build exposes window.supabase = { createClient, ... }
// We assign the CLIENT to window.db so it never conflicts with window.supabase (the module)
window.db = window.supabase.createClient(supabaseUrl, supabaseKey);
