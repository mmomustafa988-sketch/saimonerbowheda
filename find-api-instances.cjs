async function run() {
  try {
    const res = await fetch('https://api.invidious.io/instances.json');
    const data = await res.json();
    const activeWithApi = data.filter(([domain, details]) => {
      return details.type === 'https' && 
             details.monitor && 
             details.monitor.down === false && 
             details.api === true;
    });
    console.log('Total active instances with API enabled:', activeWithApi.length);
    activeWithApi.forEach(([domain, details]) => {
      console.log(`- ${domain} (health: ${details.monitor.uptime}%, cors: ${details.cors})`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
