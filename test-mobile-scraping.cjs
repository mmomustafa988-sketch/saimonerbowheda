async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const url = `https://m.youtube.com/playlist?list=${pid}`;
  
  console.log('Fetching mobile playlist page from:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+405; SOCS=CAESEwgDEgk0ODE3Nzk3OTQaAmVuIAEaBgiA_LidBg'
      }
    });
    
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML Length:', html.length);
    fs.writeFileSync('mobile-playlist.html', html);
    
    // Check if it has any watch links or video IDs
    const containsWatch = html.includes('/watch?v=');
    const containsRenderer = html.includes('playlistVideoRenderer') || html.includes('playlistItem');
    const containsThumbnail = html.includes('ytimg.com/vi/');
    
    console.log(`Contains /watch?v=:`, containsWatch);
    console.log(`Contains renderer/playlistItem:`, containsRenderer);
    console.log(`Contains ytimg.com/vi/:`, containsThumbnail);
    
    // Search for video ids using regex
    const videoIdRegex = /"videoId"\s*:\s*"([^"]+)"/g;
    const ids = [];
    let match;
    while ((match = videoIdRegex.exec(html)) !== null && ids.length < 5) {
      ids.push(match[1]);
    }
    console.log('Found videoId keys:', ids);
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}
const fs = require('fs');
run();
