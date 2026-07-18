async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  
  const uas = [
    {
      name: 'Googlebot',
      ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    },
    {
      name: 'Old Chrome',
      ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36'
    },
    {
      name: 'Mobile Safari',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    },
    {
      name: 'Wget',
      ua: 'Wget/1.20.3 (linux-gnu)'
    },
    {
      name: 'Googlebot-Video',
      ua: 'Googlebot-Video/2.1'
    }
  ];

  for (const item of uas) {
    console.log(`\nTesting User-Agent: ${item.name}...`);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': item.ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+405; SOCS=CAESEwgDEgk0ODE3Nzk3OTQaAmVuIAEaBgiA_LidBg'
        }
      });
      
      console.log('Status:', res.status);
      const html = await res.text();
      console.log('HTML Length:', html.length);
      
      const containsConsent = html.includes('consent.youtube.com');
      const containsCaptcha = html.includes('recaptcha');
      const containsWatch = html.includes('/watch?v=');
      const containsRenderer = html.includes('playlistVideoRenderer');
      const containsThumbnail = html.includes('ytimg.com/vi/');
      
      console.log(`Contains consent.youtube.com:`, containsConsent);
      console.log(`Contains recaptcha:`, containsCaptcha);
      console.log(`Contains /watch?v=:`, containsWatch);
      console.log(`Contains playlistVideoRenderer:`, containsRenderer);
      console.log(`Contains ytimg.com/vi/:`, containsThumbnail);
      
      if (containsWatch || containsRenderer) {
        console.log('SUCCESS with User-Agent:', item.name);
        fs.writeFileSync('success-playlist.html', html);
        break;
      }
    } catch (err) {
      console.log('Error:', err.message);
    }
  }
}
const fs = require('fs');
run();
