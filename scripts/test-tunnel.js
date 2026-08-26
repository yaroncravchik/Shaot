const http = require('http');

async function testTunnel() {
  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port: 5000 });
    console.log('TUNNEL_URL:', tunnel.url);
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
    
    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (e) {
    console.error('Localtunnel failed:', e.message);
  }
}

testTunnel();
