const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');
console.log('Captcha Context:');
console.log(html.substring(655800, 657800));
