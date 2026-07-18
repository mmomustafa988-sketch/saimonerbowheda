async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const key = 'AIzaSyDZNkyC-AtROwMBpLfevIvqYk-Gfi8ZOeo';
  const url = `https://www.youtube.com/youtubei/v1/browse?key=${key}`;
  
  const clients = [
    { name: 'MWEB', platform: 'MOBILE', clientVersion: '2.20240101.00.00' },
    { name: 'WEB', platform: 'DESKTOP', clientVersion: '2.20240101.00.00' },
    { name: 'ANDROID', platform: 'MOBILE', clientVersion: '19.01.35' },
    { name: 'IOS', platform: 'MOBILE', clientVersion: '19.01.35' },
    { name: 'TVHTML5', platform: 'TV', clientVersion: '7.20240101.00.00' }
  ];

  for (const client of clients) {
    for (const prefix of ['', 'VL']) {
      const browseId = `${prefix}${pid}`;
      console.log(`\n--- Testing client: ${client.name} with browseId: ${browseId} ---`);
      
      const payload = {
        browseId: browseId,
        context: {
          client: {
            clientName: client.name,
            clientVersion: client.clientVersion,
            platform: client.platform,
            hl: 'en',
            gl: 'US'
          }
        }
      };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        console.log('Status:', res.status);
        if (res.ok) {
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
          
          console.log(`Success! Found ${videos.length} videos.`);
          if (videos.length > 0) {
            console.log('First video:', {
              videoId: videos[0].videoId,
              title: videos[0].title?.runs?.[0]?.text || videos[0].title?.simpleText
            });
            return; // We found a working combination!
          }
        } else {
          console.log('Error text:', (await res.text()).substring(0, 200));
        }
      } catch (err) {
        console.log('Error:', err.message);
      }
    }
  }
}
run();
