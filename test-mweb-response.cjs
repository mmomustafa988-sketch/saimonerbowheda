async function run() {
  const pid = 'PLMC9KNkIncKvYin_USF1qoRsPAM8cjgXi';
  const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const url = `https://www.youtube.com/youtubei/v1/browse?key=${key}`;
  
  const payload = {
    browseId: `VL${pid}`,
    context: {
      client: {
        clientName: 'MWEB',
        clientVersion: '2.20260715.04.00',
        platform: 'MOBILE'
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Alerts:', JSON.stringify(data.alerts, null, 2));
    
    // Check if we can find videoId
    const videoIds = [];
    const recurse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (current.videoId) {
        videoIds.push({ videoId: current.videoId, title: current.title });
      }
      if (Array.isArray(current)) {
        current.forEach(recurse);
      } else {
        Object.keys(current).forEach(key => recurse(current[key]));
      }
    };
    recurse(data);
    console.log('Found videoIds count:', videoIds.length);
    if (videoIds.length > 0) {
      console.log('First 5 video IDs:', JSON.stringify(videoIds.slice(0, 5), null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
