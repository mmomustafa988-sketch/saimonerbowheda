const fs = require('fs');
const html = fs.readFileSync('real-playlist.html', 'utf8');

console.log('HTML length:', html.length);

const scriptRegex = /<script[^>]*>([\s\S]+?)<\/script>/g;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  const content = match[1];
  console.log(`Script tag ${count}: length = ${content.length}`);
  if (content.includes('PL3Qt8Me')) {
    console.log(`-> Tag ${count} CONTAINS playlist ID! First 300 chars:`);
    console.log(content.substring(0, 300));
  }
}
console.log('Total script tags:', count);
