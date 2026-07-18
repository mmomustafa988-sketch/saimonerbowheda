async function test() {
  const pid = 'PLBCF2DAC6FFB0A079';
  const instances = [
    'pipedapi.kavin.rocks',
    'piped-api.lunar.icu',
    'pipedapi.tokhmi.xyz',
    'pipedapi.projectsegfaut.im',
    'piped-api.garudalinux.org',
    'piped-api.privacydev.net',
    'piped-api.mha.fi',
    'pipedapi.r4fo.com',
    'piped-api.solopyti.co'
  ];
  
  for (const domain of instances) {
    const url = `https://${domain}/playlists/${pid}`;
    console.log(`Trying Piped instance: ${domain} -> ${url}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      console.log(`Status from ${domain}:`, response.status);
      if (response.ok) {
        const data = await response.json();
        console.log(`SUCCESS! Title: ${data.name}, Videos: ${data.relatedVideos ? data.relatedVideos.length : 0}`);
        if (data.relatedVideos && data.relatedVideos.length > 0) {
          console.log('First video sample:', {
            title: data.relatedVideos[0].title,
            id: data.relatedVideos[0].id,
            thumbnail: data.relatedVideos[0].thumbnail
          });
        }
        break;
      }
    } catch (err) {
      console.log(`Error from ${domain}:`, err.message);
    }
  }
}

test();
