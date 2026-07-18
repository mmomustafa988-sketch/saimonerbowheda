const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

console.log('HTML length:', html.length);

// Count occurrences of ytInitialData
let count = 0;
let pos = html.indexOf('ytInitialData');
while (pos !== -1) {
  count++;
  console.log(`Occurrence ${count} of ytInitialData at index ${pos}`);
  console.log(html.substring(pos, pos + 300));
  pos = html.indexOf('ytInitialData', pos + 1);
}

// Check for playlistVideoRenderer
const pvrIndex = html.indexOf('playlistVideoRenderer');
console.log('Index of playlistVideoRenderer:', pvrIndex);
if (pvrIndex !== -1) {
  console.log('playlistVideoRenderer context:', html.substring(pvrIndex - 100, pvrIndex + 300));
}

// Check for videoId
const vidIndex = html.indexOf('videoId');
console.log('Index of videoId:', vidIndex);
if (vidIndex !== -1) {
  console.log('videoId context:', html.substring(vidIndex - 100, vidIndex + 300));
}

// Check for titles or playlist items
const listIndex = html.indexOf('playlistItem');
console.log('Index of playlistItem:', listIndex);
