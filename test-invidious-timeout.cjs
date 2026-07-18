async function run() {
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const domains = [
    'invidious.nerdvpn.de',
    'invidious.privacydev.net',
    'invidious.lunar.icu',
    'invidio.xamh.de',
    'invidious.projectsegfaut.im',
    'inv.nadeko.net',
    'yewtu.be',
    'invidious.io'
  ];

  for (const domain of domains) {
    const url = `https://${domain}/api/v1/playlists/${pid}`;
    console.log(`\nTesting ${domain} with 15s timeout...`);
    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      console.log(`Status from ${domain}: ${res.status} (took ${Date.now() - start}ms)`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Success! Videos count: ${data.videos?.length}`);
        if (data.videos && data.videos.length > 0) {
          console.log('First video ID:', data.videos[0].videoId, 'Title:', data.videos[0].title);
          break;
        }
      } else {
        console.log('Response body:', await res.text().catch(() => ''));
      }
    } catch (err) {
      console.log(`Failed for ${domain}: ${err.message} (took ${Date.now() - start}ms)`);
    }
  }
}
run();
