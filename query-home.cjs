const https = require('https');

https.get('https://api.kryzox.xyz/home', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const home = JSON.parse(data);
      console.log('--- SPOTLIGHT/TRENDING ---');
      const spotlight = home.data?.spotlight || home.data?.trending || [];
      spotlight.slice(0, 10).forEach((item, idx) => {
        console.log(`[Rank ${idx+1}] ID: ${item.id} | Title: ${item.titles?.english || item.titles?.romaji || item.title}`);
      });

      console.log('\n--- MOST POPULAR ---');
      const mostPopular = home.data?.mostPopular || home.data?.mostPopularAnimes || [];
      mostPopular.slice(0, 10).forEach((item, idx) => {
        console.log(`[Rank ${idx+1}] ID: ${item.id} | Title: ${item.titles?.english || item.titles?.romaji || item.title}`);
      });
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
