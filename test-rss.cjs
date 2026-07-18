async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${pid}`;
  
  console.log('Fetching RSS feed from:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    console.log('Status:', res.status);
    const xml = await res.text();
    console.log('XML size:', xml.length);
    console.log('XML snippet (first 1000 chars):');
    console.log(xml.substring(0, 1000));
    
    // Simple regex-based extraction of entries
    // RSS items look like: <entry>...<yt:videoId>...</yt:videoId>...<title>...</title>...</entry>
    const entries = [];
    const entryRegex = /<entry>([\s\S]+?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const content = match[1];
      const videoIdMatch = content.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = content.match(/<title>([^<]+)<\/title>/);
      
      if (videoIdMatch && titleMatch) {
        entries.push({
          videoId: videoIdMatch[1],
          title: titleMatch[1]
        });
      }
    }
    
    console.log(`\nFound ${entries.length} videos in RSS feed!`);
    if (entries.length > 0) {
      console.log('First video:', entries[0]);
    }
  } catch (err) {
    console.error('RSS fetch failed:', err);
  }
}

run();
