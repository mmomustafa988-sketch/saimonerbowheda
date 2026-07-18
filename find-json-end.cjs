const fs = require('fs');

function decodeHexEscapes(str) {
  return str.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

const html = fs.readFileSync('mobile-sample.html', 'utf8');
const index = html.indexOf("var ytInitialData = '");
if (index !== -1) {
  const startIdx = index + "var ytInitialData = '".length;
  // Let's find the correct ending of this string
  // It should end with a single quote before </script> or another script instruction
  // Since it's a JS string, single quotes inside it must be escaped as \x27 or \'
  // Therefore, the first unescaped ' followed by a semicolon is the end.
  let endIdx = -1;
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === "'" && html[i-1] !== '\\') {
      if (html[i+1] === ';') {
        endIdx = i;
        break;
      }
    }
  }
  
  if (endIdx !== -1) {
    const rawMatch = html.substring(startIdx, endIdx);
    console.log('Raw length found with manual scan:', rawMatch.length);
    const decoded = decodeHexEscapes(rawMatch);
    console.log('Decoded length:', decoded.length);
    try {
      const data = JSON.parse(decoded);
      console.log('SUCCESS PARSING MANUAL SCAN!');
    } catch (err) {
      console.error('Manual scan parse failed:', err.message);
      // Let's find where the error is by showing surrounding chars of the error index
      const match = err.message.match(/at position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        console.log('Error context in decoded string:');
        console.log(decoded.substring(Math.max(0, pos - 100), Math.min(decoded.length, pos + 100)));
      }
    }
  }
}
