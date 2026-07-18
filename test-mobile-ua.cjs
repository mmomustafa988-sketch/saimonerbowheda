const fs = require('fs');

async function test() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  console.log('Fetching', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  console.log('HTML Length:', html.length);
  
  // Save some sample of html
  fs.writeFileSync('mobile-sample.html', html);
  console.log('Saved mobile-sample.html');
  
  // Search for occurrences of ytInitialData or other json on page
  let pos = 0;
  let matchCount = 0;
  while (true) {
    const idx = html.indexOf('ytInitialData', pos);
    if (idx === -1) break;
    matchCount++;
    console.log(`\n--- Match ${matchCount} at index ${idx} ---`);
    console.log(html.substring(idx - 50, idx + 400));
    pos = idx + 1;
  }
}

test();
