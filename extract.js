const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

function processFile(filename) {
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    
    console.log(`Processing ${filename}...`);
    
    let html = fs.readFileSync(filename, 'utf-8');
    const $ = cheerio.load(html, { decodeEntities: false });
    
    let cssContent = '';
    let jsContent = '';
    
    $('style').each((i, el) => {
        cssContent += $(el).html() + '\n';
        $(el).remove();
    });
    
    $('script:not([src])').each((i, el) => {
        jsContent += $(el).html() + '\n';
        $(el).remove();
    });
    
    if (cssContent.trim()) {
        fs.writeFileSync(`${basename}.css`, cssContent);
        $('head').append(`\n    <link rel="stylesheet" href="${basename}.css">`);
        console.log(`Extracted CSS to ${basename}.css`);
    }
    
    if (jsContent.trim()) {
        fs.writeFileSync(`${basename}.js`, jsContent);
        $('body').append(`\n    <script src="${basename}.js"></script>`);
        console.log(`Extracted JS to ${basename}.js`);
    }
    
    fs.writeFileSync(filename, $.html());
    console.log(`Updated ${filename}`);
}

processFile('index.html');
processFile('admin.html');
