const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('admin.html', 'utf-8');
const $ = cheerio.load(html);

$('form').each((i, el) => {
    console.log('Form ID:', $(el).attr('id'), 'Class:', $(el).attr('class'));
    $(el).find('input, textarea, select, button').each((j, input) => {
        console.log(`  - ${$(input).prop('tagName')} | name: ${$(input).attr('name')} | id: ${$(input).attr('id')} | type: ${$(input).attr('type')}`);
    });
});
