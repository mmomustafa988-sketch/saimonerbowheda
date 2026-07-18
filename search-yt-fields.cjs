const fs = require('fs');

// We can just run the fetch and parse the data to see where the videos are.
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
  const html = await response.text();
  
  const regex = /ytInitialData\s*=\s*({[\s\S]+?});\s*(?:<\/script>|window|var)/;
  const match = html.match(regex);
  if (!match) {
    console.log('No match');
    return;
  }
  
  const data = JSON.parse(match[1]);
  console.log('Keys of data:', Object.keys(data));
  
  // Find all objects that have a property containing "videoId"
  const videoObjects = [];
  const findVideoObjects = (current, path = '') => {
    if (!current || typeof current !== 'object') return;
    
    if (current.videoId) {
      videoObjects.push({ path, keys: Object.keys(current), videoId: current.videoId, title: current.title });
    }
    
    if (Array.isArray(current)) {
      current.forEach((item, idx) => {
        findVideoObjects(item, `${path}[${idx}]`);
      });
    } else {
      Object.keys(current).forEach(key => {
        findVideoObjects(current[key], `${path}.${key}`);
      });
    }
  };
  
  findVideoObjects(data);
  console.log('Found objects with videoId count:', videoObjects.length);
  if (videoObjects.length > 0) {
    console.log('First 5 objects with videoId:');
    videoObjects.slice(0, 5).forEach((item, idx) => {
      console.log(`\n--- Object ${idx + 1} at path ${item.path} ---`);
      console.log('Keys:', item.keys);
      console.log('videoId:', item.videoId);
      console.log('title:', JSON.stringify(item.title));
    });
  }
}

test();
