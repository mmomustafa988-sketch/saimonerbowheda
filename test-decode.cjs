const fs = require('fs');

function decodeHexEscapes(str) {
  return str.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

async function test() {
  const html = fs.readFileSync('mobile-sample.html', 'utf8');
  
  // Try matching different patterns of ytInitialData
  const regexes = [
    /ytInitialData\s*=\s*'([\s\S]+?)';/,
    /ytInitialData\s*=\s*"([\s\S]+?)";/,
    /ytInitialData\s*=\s*({[\s\S]+?});/
  ];
  
  let jsonStr = '';
  for (const regex of regexes) {
    const match = html.match(regex);
    if (match && match[1]) {
      const matchedContent = match[1].trim();
      if (matchedContent.startsWith('\\x7b') || matchedContent.startsWith('{')) {
        jsonStr = matchedContent;
        console.log('Matched regex:', regex);
        break;
      }
    }
  }
  
  if (!jsonStr) {
    console.log('Failed to match jsonStr');
    return;
  }
  
  console.log('Matched raw slice:', jsonStr.substring(0, 200));
  
  let decoded = jsonStr;
  if (jsonStr.includes('\\x')) {
    decoded = decodeHexEscapes(jsonStr);
  }
  
  console.log('Decoded slice:', decoded.substring(0, 200));
  
  try {
    const data = JSON.parse(decoded);
    console.log('Parse success!');
    
    // Let's recurse to find all playlistVideoRenderer objects or other videos
    const renderers = [];
    const recurse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (current.playlistVideoRenderer) {
        renderers.push(current.playlistVideoRenderer);
        return;
      }
      if (current.playlistVideoListRenderer) {
        console.log('Found playlistVideoListRenderer!');
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
      console.log('First renderer keys:', Object.keys(renderers[0]));
      console.log('First renderer videoId:', renderers[0].videoId);
      console.log('First renderer title:', JSON.stringify(renderers[0].title));
    }
  } catch (err) {
    console.error('Failed to parse:', err.message);
  }
}

test();
