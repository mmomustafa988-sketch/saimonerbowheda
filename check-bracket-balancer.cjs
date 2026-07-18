const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

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

const jsonStr = extractYtInitialData(html);
console.log('Extracted JSON length:', jsonStr ? jsonStr.length : 'NULL');
console.log('EXTRACTED STRING:');
console.log(jsonStr);
