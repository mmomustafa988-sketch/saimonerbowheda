async function run() {
  try {
    const res = await fetch('https://api.invidious.io/instances.json');
    const data = await res.json();
    console.log('Is Array?', Array.isArray(data));
    console.log('Keys of data:', Object.keys(data).slice(0, 10));
    console.log('First item structure:', JSON.stringify(data[0] || Object.entries(data)[0] || {}, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
