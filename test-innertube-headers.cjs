async function run() {
  const pid = 'PLMC9KNkIncKvYin_USF1qoRsPAM8cjgXi';
  const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const url = `https://www.youtube.com/youtubei/v1/browse?key=${key}`;
  
  const payload = {
    browseId: `VL${pid}`,
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.01.00',
        hl: 'en',
        gl: 'US',
        utcOffsetMinutes: 0
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Alerts:', JSON.stringify(data.alerts, null, 2));
    
    const renderers = [];
    const recurse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (current.playlistVideoRenderer) {
        renderers.push(current.playlistVideoRenderer);
        return;
      }
      if (Array.isArray(current)) {
        current.forEach(recurse);
      } else {
        Object.keys(current).forEach(key => recurse(current[key]));
      }
    };
    recurse(data);
    console.log('Found video renderers count:', renderers.length);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
