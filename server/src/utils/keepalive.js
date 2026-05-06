const keepalive = () => {
  const url = process.env.RENDER_URL;
  if (!url) return; // only runs in production

  setInterval(async () => {
    try {
      await fetch(`${url}/api/health`);
      console.log('[keepalive] Pinged successfully');
    } catch (err) {
      console.log('[keepalive] Ping failed:', err.message);
    }
  }, 14 * 60 * 1000);
};

export default keepalive;