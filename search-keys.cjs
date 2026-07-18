const fs = require('fs');

function extractYtInitialData(html) {
  const marker = 'ytInitialData = ';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  
  const startIdx = html.indexOf('{', idx);
  if (startIdx === -1) return null;
  
  let braceCount = 0;
  let endIdx = -1;
  let inString = false;
  let escape = false;
  
  for (let i = startIdx; i < html.length; i++) {
    const char = html[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }
  
  if (endIdx !== -1) {
    return html.substring(startIdx, endIdx + 1);
  }
  return null;
}

const html = fs.readFileSync('real-playlist.html', 'utf8');
const jsonStr = extractYtInitialData(html);
if (!jsonStr) {
  console.log('No ytInitialData string extracted!');
  return;
}

console.log('Extracted JSON size:', jsonStr.length);
try {
  const data = JSON.parse(jsonStr);
  console.log('Successfully parsed!');
  
  // Let's collect all keys in the object that contain 'Renderer' or look like a video list
  const renderers = new Set();
  const findRendererKeys = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(findRendererKeys);
    } else {
      for (const k of Object.keys(obj)) {
        if (k.toLowerCase().includes('renderer')) {
          renderers.add(k);
        }
        findRendererKeys(obj[k]);
      }
    }
  };
  findRendererKeys(data);
  console.log('Renderer keys found in ytInitialData:', Array.from(renderers));
  
} catch (e) {
  console.error('Failed parsing JSON:', e.message);
}
