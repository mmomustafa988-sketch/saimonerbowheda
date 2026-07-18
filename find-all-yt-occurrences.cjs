const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

let pos = 0;
let count = 0;
while (true) {
  const idx = html.indexOf('ytInitialData =', pos);
  if (idx === -1) break;
  count++;
  console.log(`Occurrence #${count} at index ${idx}:`);
  console.log(html.substring(idx, idx + 400));
  console.log('---');
  pos = idx + 1;
}
