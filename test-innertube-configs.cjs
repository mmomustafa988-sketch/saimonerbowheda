async function run() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const url = `https://www.youtube.com/youtubei/v1/browse?key=${key}`;
  
  const configs = [
    {
      name: 'WEB with VL',
      payload: {
        browseId: `VL${pid}`,
        context: { client: { clientName: 'WEB', clientVersion: '2.20260715.04.00', originalUrl: `https://www.youtube.com/playlist?list=${pid}`, platform: 'DESKTOP' } }
      }
    },
    {
      name: 'WEB without VL',
      payload: {
        browseId: pid,
        context: { client: { clientName: 'WEB', clientVersion: '2.20260715.04.00', originalUrl: `https://www.youtube.com/playlist?list=${pid}`, platform: 'DESKTOP' } }
      }
    },
    {
      name: 'ANDROID with VL',
      payload: {
        browseId: `VL${pid}`,
        context: { client: { clientName: 'ANDROID', clientVersion: '17.31.35', platform: 'MOBILE' } }
      }
    },
    {
      name: 'ANDROID without VL',
      payload: {
        browseId: pid,
        context: { client: { clientName: 'ANDROID', clientVersion: '17.31.35', platform: 'MOBILE' } }
      }
    },
    {
      name: 'IOS with VL',
      payload: {
        browseId: `VL${pid}`,
        context: { client: { clientName: 'IOS', clientVersion: '17.31.35', platform: 'MOBILE' } }
      }
    },
    {
      name: 'MWEB with VL',
      payload: {
        browseId: `VL${pid}`,
        context: { client: { clientName: 'MWEB', clientVersion: '2.20260715.04.00', platform: 'MOBILE' } }
      }
    }
  ];

  for (const config of configs) {
    console.log(`\n--- Testing ${config.name} ---`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(config.payload)
      });
      console.log('Status:', res.status);
      if (res.ok) {
        const data = await res.json();
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
        console.log(`Success! Found ${renderers.length} videos.`);
        if (renderers.length > 0) {
          console.log('First video ID:', renderers[0].videoId);
          break;
        }
      } else {
        console.log('Error text:', await res.text());
      }
    } catch (err) {
      console.log('Fetch error:', err.message);
    }
  }
}

run();
