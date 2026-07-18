const fs = require('fs');
const html = fs.readFileSync('desktop-sample.html', 'utf8');

// Find occurrences of INNERTUBE_API_KEY
const regexes = [
  /"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/,
  /"apiKey"\s*:\s*"([^"]+)"/,
  /INNERTUBE_API_KEY\s*=\s*"([^"]+)"/,
  /apiKey\s*=\s*"([^"]+)"/
];

for (const regex of regexes) {
  const match = html.match(regex);
  if (match) {
    console.log('Found with regex', regex, ':', match[1]);
  }
}

// Let's print any keys starting with AIzaSy
let pos = 0;
while (true) {
  const idx = html.indexOf('AIzaSy', pos);
  if (idx === -1) break;
  console.log('Found AIzaSy key:', html.substring(idx, idx + 45));
  pos = idx + 1;
}
