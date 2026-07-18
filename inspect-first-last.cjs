const fs = require('fs');
const html = fs.readFileSync('desktop-sample.html', 'utf8');
console.log('First 1000 characters of desktop-sample.html:');
console.log(html.substring(0, 1000));
console.log('\nLast 1000 characters:');
console.log(html.substring(html.length - 1000));
