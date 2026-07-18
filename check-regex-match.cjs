const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

let jsonStr = '';
const regexes = [
  /ytInitialData\s*=\s*({[\s\S]+?});\s*(?:<\/script>|window|var)/,
  /ytInitialData\s*=\s*({[\s\S]+?});/,
  /var ytInitialData\s*=\s*([\s\S]+?);<\/script>/,
  /window\["ytInitialData"\]\s*=\s*([\s\S]+?);/
];

for (let i = 0; i < regexes.length; i++) {
  const match = html.match(regexes[i]);
  if (match && match[1]) {
    console.log(`Regex ${i} matched! Match length:`, match[1].length);
    jsonStr = match[1].trim();
    break;
  }
}

if (!jsonStr) {
  console.log('No regex matched!');
  // Let's do a substring match from "var ytInitialData = " to ");" or "</script>"
  const idx = html.indexOf('var ytInitialData = ');
  if (idx !== -1) {
    const start = idx + 'var ytInitialData = '.length;
    // Find the next "</script>"
    const end = html.indexOf('</script>', start);
    if (end !== -1) {
      let candidate = html.substring(start, end).trim();
      if (candidate.endsWith(';')) {
        candidate = candidate.slice(0, -1);
      }
      console.log('Substring fallback found! Length:', candidate.length);
      jsonStr = candidate;
    }
  }
}

if (jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    console.log('Successfully parsed JSON!');
    
    // Find all videoId in the parsed JSON
    const videos = [];
    const recurse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (current.playlistVideoRenderer) {
        videos.push(current.playlistVideoRenderer);
        return;
      }
      if (Array.isArray(current)) {
        current.forEach(recurse);
      } else {
        Object.keys(current).forEach(key => recurse(current[key]));
      }
    };
    recurse(data);
    console.log('Found playlistVideoRenderer count:', videos.length);
    if (videos.length > 0) {
      console.log('First video ID:', videos[0].videoId);
      console.log('First video title:', JSON.stringify(videos[0].title));
    }
  } catch (err) {
    console.log('JSON parse failed:', err.message);
  }
}
