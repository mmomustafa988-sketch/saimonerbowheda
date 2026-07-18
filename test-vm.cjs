const fs = require('fs');
const vm = require('vm');

async function test() {
  const html = fs.readFileSync('mobile-sample.html', 'utf8');
  
  const index = html.indexOf("var ytInitialData = '");
  if (index === -1) {
    console.log('Not found');
    return;
  }
  
  const startIdx = index + "var ytInitialData = '".length;
  let endIdx = -1;
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === "'" && html[i-1] !== '\\') {
      if (html[i+1] === ';') {
        endIdx = i;
        break;
      }
    }
  }
  
  if (endIdx === -1) {
    console.log('No end found');
    return;
  }
  
  const rawMatch = html.substring(startIdx, endIdx);
  console.log('Raw match length:', rawMatch.length);
  
  try {
    const context = {};
    vm.createContext(context);
    vm.runInContext(`var val = '${rawMatch}';`, context);
    console.log('VM execution success!');
    const decodedStr = context.val;
    console.log('Decoded string length:', decodedStr.length);
    console.log('Decoded start:', decodedStr.substring(0, 150));
    
    const data = JSON.parse(decodedStr);
    console.log('JSON parse success! Keys:', Object.keys(data));
    
    // Check if we can find videos
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
      console.log('First videoId:', renderers[0].videoId);
      console.log('First title:', JSON.stringify(renderers[0].title));
    }
  } catch (err) {
    console.error('VM/Parse Error:', err.message);
  }
}

test();
