const supabaseUrl = 'https://qizmvaqpgwrxwpzrhrmm.supabase.co';
const supabaseKey = 'sb_publishable_JmcTBT912FeSyjQDk9UsrQ_BRVOPRT1';

// The CDN exposes the Supabase module as window.supabase. Keep the initialized
// client under a separate, stable name so it cannot be confused with the module.
window.db = window.supabase.createClient(supabaseUrl, supabaseKey);
