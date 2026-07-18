const fs = require('fs');
const html = fs.readFileSync('desktop-sample.html', 'utf8');

let pos = 0;
while (true) {
  const idx = html.indexOf('PLBCF2DAC6FFB0A079', pos);
  if (idx === -1) break;
  console.log(`\n--- Match at index ${idx} ---`);
  console.log(html.substring(idx - 150, idx + 250));
  pos = idx + 1;
}
