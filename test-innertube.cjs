async function run() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const browseId = pid.startsWith('VL') ? pid : `VL${pid}`;
  const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const url = `https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`;
  
  const payload = {
    browseId: browseId,
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.01.00',
        originalUrl: `https://www.youtube.com/playlist?list=${pid}`,
        platform: 'DESKTOP'
      }
    }
  };

  console.log('Sending POST to', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.youtube.com/playlist?list=${pid}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Status:', res.status);
    if (!res.ok) {
      console.log('Error text:', await res.text());
      return;
    }
    
    const data = await res.json();
    console.log('Keys of data:', Object.keys(data));
    
    const renderers = [];
    const recurse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (current.playlistVideoRenderer) {
        renderers.push(current.playlistVideoRenderer);
        return;
      }
      if (Array.isArray(current)) {
        for (const item of current) {
          recurse(item);
        }
      } else {
        for (const key of Object.keys(current)) {
          recurse(current[key]);
        }
      }
    };
    
    recurse(data);
    console.log('Found renderers count via InnerTube:', renderers.length);
    if (renderers.length > 0) {
      console.log('First video ID:', renderers[0].videoId);
      console.log('First title:', JSON.stringify(renderers[0].title));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
