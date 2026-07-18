async function run() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const pid = 'PL3Qt8Me0vGeXlU0171H19A-Y98GkKzC70';
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${pid}&maxResults=5&key=${apiKey}`;
  
  console.log('Fetching from Google YouTube API...');
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.substring(0, 500));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
