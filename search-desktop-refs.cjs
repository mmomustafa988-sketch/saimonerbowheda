const fs = require('fs');

async function test() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  console.log('Fetching Desktop', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  const html = await response.text();
  console.log('Desktop HTML Length:', html.length);
  
  console.log('Occurrences of videoId:', html.split('videoId').length - 1);
  console.log('Occurrences of playlistVideoRenderer:', html.split('playlistVideoRenderer').length - 1);
  
  // Let's write the desktop html to desktop-sample.html
  fs.writeFileSync('desktop-sample.html', html);
  console.log('Saved desktop-sample.html');
}

test();
