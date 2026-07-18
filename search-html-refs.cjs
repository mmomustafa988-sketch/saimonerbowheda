const fs = require('fs');
const html = fs.readFileSync('mobile-sample.html', 'utf8');

console.log('Occurrences of videoId:', html.split('videoId').length - 1);
console.log('Occurrences of playlistVideoRenderer:', html.split('playlistVideoRenderer').length - 1);
console.log('Occurrences of browseId:', html.split('browseId').length - 1);

// Let's search for "PLBCF2DAC6FFB0A079" to see what references exist
let pos = 0;
while (true) {
  const idx = html.indexOf('PLBCF2DAC6FFB0A079', pos);
  if (idx === -1) break;
  console.log(`Playlist ID at ${idx}:`, html.substring(idx - 50, idx + 150));
  pos = idx + 1;
}
