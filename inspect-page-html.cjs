const fs = require('fs');

async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+405; SOCS=CAESEwgDEgk0ODE3Nzk3OTQaAmVuIAEaBgiA_LidBg'
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  fs.writeFileSync('real-playlist.html', html);
  console.log('Saved real-playlist.html. Length:', html.length);
  
  // Is it a redirect or consent page?
  if (html.includes('consent.youtube.com')) {
    console.log('CONTAINS consent.youtube.com!');
  }
  if (html.includes('google.com/recaptcha')) {
    console.log('CONTAINS google recaptcha!');
  }
  
  // Find ytInitialData
  const idx = html.indexOf('ytInitialData');
  console.log('Index of ytInitialData:', idx);
  if (idx !== -1) {
    console.log('ytInitialData surrounding text:', html.substring(idx - 100, idx + 200));
  }
}
run();
