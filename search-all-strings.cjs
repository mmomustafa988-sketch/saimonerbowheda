const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

console.log('HTML size:', html.length);

// Count "/watch?v="
let watchCount = 0;
let pos = html.indexOf('/watch?v=');
while (pos !== -1) {
  watchCount++;
  if (watchCount <= 5) {
    console.log(`watch match ${watchCount} at ${pos}: ${html.substring(pos, pos + 100)}`);
  }
  pos = html.indexOf('/watch?v=', pos + 1);
}
console.log('Total "/watch?v=" occurrences:', watchCount);

// Count "watchEndpoint"
let endpointCount = 0;
pos = html.indexOf('watchEndpoint');
while (pos !== -1) {
  endpointCount++;
  if (endpointCount <= 5) {
    console.log(`watchEndpoint match ${endpointCount} at ${pos}: ${html.substring(pos - 50, pos + 150)}`);
  }
  pos = html.indexOf('watchEndpoint', pos + 1);
}
console.log('Total "watchEndpoint" occurrences:', endpointCount);

// Search for any 11-char strings that look like YouTube video IDs
// E.g. "vi/" or "vi_webp/" or "i.ytimg.com/vi/"
let ytimgCount = 0;
pos = html.indexOf('ytimg.com/vi/');
while (pos !== -1) {
  ytimgCount++;
  if (ytimgCount <= 5) {
    console.log(`ytimg match ${ytimgCount} at ${pos}: ${html.substring(pos - 50, pos + 150)}`);
  }
  pos = html.indexOf('ytimg.com/vi/', pos + 1);
}
console.log('Total "ytimg.com/vi/" occurrences:', ytimgCount);
