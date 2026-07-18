// No require node-fetch since node 18+ has global fetch

async function test() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  console.log('Fetching', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  console.log('HTML Length:', html.length);
  
  // Try to find ytInitialData
  const regexes = [
    /ytInitialData\s*=\s*({[\s\S]+?});\s*(?:<\/script>|window|var)/,
    /ytInitialData\s*=\s*({[\s\S]+?});/,
    /var ytInitialData\s*=\s*([\s\S]+?);<\/script>/,
    /window\["ytInitialData"\]\s*=\s*([\s\S]+?);/
  ];

  let jsonStr = '';
  for (const regex of regexes) {
    const match = html.match(regex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
      console.log('Matched with regex:', regex);
      break;
    }
  }

  if (!jsonStr) {
    console.log('No jsonStr matched.');
    // Let's print some window.ytInitialData occurrences
    const index = html.indexOf('ytInitialData');
    if (index !== -1) {
      console.log('Found ytInitialData at index:', index);
      console.log('Context:', html.substring(index, index + 500));
    } else {
      console.log('ytInitialData string not found at all!');
    }
    return;
  }

  console.log('JSON slice:', jsonStr.substring(0, 200));
  try {
    const data = JSON.parse(jsonStr);
    console.log('Parse success!');
    
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
    console.log('Found renderers:', renderers.length);
    if (renderers.length > 0) {
      console.log('First renderer videoId:', renderers[0].videoId);
      console.log('First renderer title:', JSON.stringify(renderers[0].title));
    }
  } catch (e) {
    console.error('Parse error:', e.message);
  }
}

test();
