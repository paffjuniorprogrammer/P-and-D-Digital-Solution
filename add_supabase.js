const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

function addSupabase(filename) {
    console.log(`Adding Supabase to ${filename}...`);
    let html = fs.readFileSync(filename, 'utf-8');
    const $ = cheerio.load(html, { decodeEntities: false });
    
    // Add Supabase scripts before the first custom script, or at the end of body
    const supabaseScripts = `
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="supabase.js"></script>
`;
    
    $('body').append(supabaseScripts);
    
    fs.writeFileSync(filename, $.html());
    console.log(`Updated ${filename}`);
}

addSupabase('index.html');
addSupabase('admin.html');
