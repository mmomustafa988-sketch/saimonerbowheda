const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

const terms = ['captcha', 'recaptcha', 'robot', 'verify', 'cookie'];
for (const term of terms) {
  let pos = html.indexOf(term);
  console.log(`\n--- Term "${term}" ---`);
  while (pos !== -1) {
    console.log(`Found at index ${pos}`);
    console.log(html.substring(Math.max(0, pos - 150), Math.min(html.length, pos + 250)));
    pos = html.indexOf(term, pos + 1);
    break; // Just print the first occurrence
  }
}
