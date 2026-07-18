const fetchPlaylistPage = async (pid) => {
  const url = `https://www.youtube.com/playlist?list=${pid}`;
  console.log('Scraping URL:', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+405; SOCS=CAESEwgDEgk0ODE3Nzk3OTQaAmVuIAEaBgiA_LidBg'
    }
  });

  if (!response.ok) {
    throw new Error(`YouTube returned status ${response.status} when scraping playlist.`);
  }

  const html = await response.text();

  // Extract ytInitialData object
  let jsonStr = '';
  const regexes = [
    /ytInitialData\s*=\s*({[\s\S]+?});\s*(?:<\/script>|window|var)/,
    /ytInitialData\s*=\s*({[\s\S]+?});/,
    /var ytInitialData\s*=\s*([\s\S]+?);<\/script>/,
    /window\["ytInitialData"\]\s*=\s*([\s\S]+?);/
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
      break;
    }
  }

  if (!jsonStr) {
    throw new Error('Could not find playlist data (ytInitialData) in YouTube response. Make sure the playlist is public.');
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error('Failed to parse YouTube playlist data.');
  }

  // Find all playlistVideoRenderer instances recursively
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

  if (renderers.length === 0) {
    throw new Error('No videos found in YouTube playlist. Make sure the playlist is public and contains videos.');
  }

  return renderers.map((video) => {
    const videoId = video.videoId || '';
    let title = '';
    if (video.title) {
      if (video.title.runs && video.title.runs[0]) {
        title = video.title.runs[0].text || '';
      } else if (video.title.simpleText) {
        title = video.title.simpleText || '';
      }
    }

    let thumbnail = '';
    const thumbs = video.thumbnail?.thumbnails || [];
    if (thumbs.length > 0) {
      const highest = thumbs.reduce((prev, curr) => {
        return (prev.width || 0) > (curr.width || 0) ? prev : curr;
      });
      thumbnail = highest.url || '';
    }

    return {
      videoId,
      title,
      thumbnail
    };
  });
};

async function run() {
  try {
    const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
    const videos = await fetchPlaylistPage(pid);
    console.log('SUCCESS! Scraped videos count:', videos.length);
    console.log('First 3 videos:', videos.slice(0, 3));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
