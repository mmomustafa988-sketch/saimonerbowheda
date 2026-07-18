async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70'; // Active, public playlist ID
  const key = 'AIzaSyDZNkyC-AtROwMBpLfevIvqYk-Gfi8ZOeo'; // YouTube InnerTube specific key
  const url = `https://www.youtube.com/youtubei/v1/browse?key=${key}`;
  
  const payload = {
    browseId: pid,
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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
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
  } catch (err) {
    console.log('Error:', err.message);
  }
}

run();
