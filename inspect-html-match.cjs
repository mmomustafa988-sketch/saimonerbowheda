const fs = require('fs');

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
  
  const index = html.indexOf('ytInitialData');
  console.log('Index of ytInitialData:', index);
  if (index !== -1) {
    const chunk = html.substring(index, index + 3000);
    console.log('First 3000 chars of ytInitialData context:');
    console.log(chunk);
  }
}

test();
