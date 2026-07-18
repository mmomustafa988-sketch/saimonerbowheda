const fs = require('fs');

function run() {
  const html = fs.readFileSync('real-playlist.html', 'utf-8');
  console.log('HTML size:', html.length);

  let jsonStr = '';
  const regexes = [
    /ytInitialData\s*=\s*({[\s\S]+?});\s*(?:<\/script>|window|var)/,
    /ytInitialData\s*=\s*({[\s\S]+?});/,
    /var ytInitialData\s*=\s*([\s\S]+?);<\/script>/,
    /window\["ytInitialData"\]\s*=\s*([\s\S]+?);/
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
      console.log('Matched with regex:', regex);
      break;
    }
  }

  if (!jsonStr) {
    console.log('No regex matched!');
    return;
  }

  console.log('Extracted JSON size:', jsonStr.length);
  try {
    const data = JSON.parse(jsonStr);
    console.log('Parsed successfully! Root keys:', Object.keys(data));
    
    const renderers = [];
    const recurse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (current.playlistVideoRenderer) {
        renderers.push(current.playlistVideoRenderer);
        return;
      }
      if (Array.isArray(current)) {
        for (const item of current) {
          recurse(item);
        }
      } else {
        for (const key of Object.keys(current)) {
          recurse(current[key]);
        }
      }
    };
    
    recurse(data);
    console.log('Number of playlistVideoRenderer found:', renderers.length);
    if (renderers.length > 0) {
      console.log('First video ID:', renderers[0].videoId);
    }
  } catch (err) {
    console.error('JSON Parse error:', err.message);
    // Print the first and last 200 chars of jsonStr to see if it's truncated or incorrect
    console.log('First 200 chars of jsonStr:', jsonStr.substring(0, 200));
    console.log('Last 200 chars of jsonStr:', jsonStr.substring(jsonStr.length - 200));
  }
}

run();
