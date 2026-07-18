async function run() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  
  console.log('Fetching playlist page to extract visitorData and cookies...');
  let visitorData = '';
  let cookies = '';
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+405; SOCS=CAESEwgDEgk0ODE3Nzk3OTQaAmVuIAEaBgiA_LidBg'
      }
    });
    
    // Extract set-cookie headers
    const cookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    cookies = cookieHeaders.map(c => c.split(';')[0]).join('; ') || 'CONSENT=YES+cb.20210328-17-p0.en+FX+405; SOCS=CAESEwgDEgk0ODE3Nzk3OTQaAmVuIAEaBgiA_LidBg';
    
    const html = await res.text();
    const visitorMatch = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
    if (visitorMatch) {
      visitorData = visitorMatch[1];
      console.log('Extracted visitorData:', visitorData);
    } else {
      console.log('Could not extract visitorData from page.');
    }
  } catch (err) {
    console.error('Failed to pre-fetch page:', err.message);
  }

  if (!visitorData) {
    visitorData = 'Cgs3aF9JRlBOYXZXbyjqouzSBjIKCgJTRxIEGgAgLWLgAgrdAjE2LllURT1rc09jOXpQeDVwanB4cU5fNE82NHV0TWFQaV9zeF';
  }

  // Now, try InnerTube browse with visitorData
  const innerKey = 'AIzaSyDZNkyC-AtROwMBpLfevIvqYk-Gfi8ZOeo';
  const innerUrl = `https://www.youtube.com/youtubei/v1/browse?key=${innerKey}`;
  
  const clients = [
    { name: 'MWEB', platform: 'MOBILE', clientVersion: '2.20240101.00.00' },
    { name: 'WEB', platform: 'DESKTOP', clientVersion: '2.20240101.00.00' },
    { name: 'ANDROID', platform: 'MOBILE', clientVersion: '19.01.35' }
  ];

  for (const client of clients) {
    for (const prefix of ['VL', '']) {
      const browseId = `${prefix}${pid}`;
      console.log(`\n--- Testing InnerTube with ${client.name} (browseId: ${browseId}) ---`);
      
      const payload = {
        browseId: browseId,
        context: {
          client: {
            clientName: client.name,
            clientVersion: client.clientVersion,
            platform: client.platform,
            hl: 'en',
            gl: 'US',
            visitorData: visitorData
          }
        }
      };

      try {
        const res = await fetch(innerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': cookies
          },
          body: JSON.stringify(payload)
        });
        
        console.log('Status:', res.status);
        const data = await res.json();
        
        if (data.alerts) {
          console.log('Alerts:', JSON.stringify(data.alerts));
        }
        
        const videos = [];
        const recurse = (current) => {
          if (!current || typeof current !== 'object') return;
          if (current.playlistVideoRenderer) {
            videos.push(current.playlistVideoRenderer);
          }
          if (Array.isArray(current)) current.forEach(recurse);
          else Object.keys(current).forEach(k => recurse(current[k]));
        };
        recurse(data);
        
        console.log(`Found ${videos.length} videos!`);
        if (videos.length > 0) {
          console.log('First video:', {
            videoId: videos[0].videoId,
            title: videos[0].title?.runs?.[0]?.text || videos[0].title?.simpleText
          });
          return;
        }
      } catch (err) {
        console.log('Error during InnerTube call:', err.message);
      }
    }
  }
}

run();
