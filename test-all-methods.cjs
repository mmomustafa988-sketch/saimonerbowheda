async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70'; // Active, public playlist ID
  const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  
  // Method 1: InnerTube MWEB
  const urlMweb = `https://www.youtube.com/youtubei/v1/browse?key=${key}`;
  const payloadMweb = {
    browseId: `VL${pid}`,
    context: {
      client: {
        clientName: 'MWEB',
        clientVersion: '2.20260715.04.00',
        platform: 'MOBILE',
        hl: 'en',
        gl: 'US'
      }
    }
  };

  console.log('\n--- Testing InnerTube MWEB ---');
  try {
    const res = await fetch(urlMweb, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadMweb)
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Alerts:', JSON.stringify(data.alerts, null, 2));
      const videoIds = [];
      const recurse = (current) => {
        if (!current || typeof current !== 'object') return;
        if (current.videoId) {
          videoIds.push({ videoId: current.videoId, title: current.title });
        }
        if (Array.isArray(current)) current.forEach(recurse);
        else Object.keys(current).forEach(key => recurse(current[key]));
      };
      recurse(data);
      console.log('Found videoIds:', videoIds.length);
      if (videoIds.length > 0) {
        console.log('First 2 videos:', videoIds.slice(0, 2));
      }
    }
  } catch (err) {
    console.log('Error MWEB:', err.message);
  }

  // Method 2: Invidious Proxy with correct api/cors filtering
  console.log('\n--- Testing Invidious Proxy ---');
  const fallbackDomains = [
    'invidious.nerdvpn.de',
    'invidious.privacydev.net',
    'invidious.lunar.icu',
    'invidio.xamh.de',
    'invidious.projectsegfaut.im'
  ];
  for (const domain of fallbackDomains) {
    const url = `https://${domain}/api/v1/playlists/${pid}`;
    console.log(`Trying ${domain}...`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log(`Status from ${domain}:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`Success from ${domain}! Videos:`, data.videos?.length);
        if (data.videos && data.videos.length > 0) {
          console.log('First video:', data.videos[0].videoId, data.videos[0].title);
          break;
        }
      }
    } catch (err) {
      console.log(`Failed for ${domain}:`, err.message);
    }
  }
}

run();
