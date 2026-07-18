const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

console.log('HTML Length:', html.length);

// Extract title
const titleMatch = html.match(/<title>([\s\S]+?)<\/title>/i);
if (titleMatch) {
  console.log('Title tag:', titleMatch[1]);
} else {
  console.log('No title tag found');
}

// Find some key keywords
const keywords = [
  'consent', 'captcha', 'robot', 'verify', 'cookie', 
  'login', 'sign in', 'playlist', 'watch', 'video', 'error', 'not found',
  'ytInitialPlayerResponse', 'ytInitialData'
];

for (const kw of keywords) {
  const indices = [];
  let pos = html.indexOf(kw);
  while (pos !== -1) {
    indices.push(pos);
    if (indices.length >= 3) break;
    pos = html.indexOf(kw, pos + 1);
  }
  console.log(`Keyword "${kw}": found ${indices.length ? 'at indices ' + indices.join(', ') : 'not found'}`);
}

// Let's print some lines around the first div or main sections
const bodyStart = html.indexOf('<body');
if (bodyStart !== -1) {
  console.log('\nHTML starting around <body>:');
  console.log(html.substring(bodyStart, bodyStart + 1000));
}
