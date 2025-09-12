const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key';

// Generate a test token
const testToken = jwt.sign({ userId: 'test-user-123', scope: 'websocket' }, JWT_SECRET, { expiresIn: '1h' });

console.log('Test token:', testToken);
console.log('Token length:', testToken.length);

// Try to connect to WebSocket
const wsUrl = `ws://localhost:3000/api/chat/ws?token=${encodeURIComponent(testToken)}`;
console.log('Connecting to:', wsUrl.substring(0, 100) + '...');

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('WebSocket connection established!');
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', function message(data) {
  console.log('Received message:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err.message);
  console.error('Error details:', err);
});

ws.on('close', function close(code, reason) {
  console.log('WebSocket connection closed:', code, reason.toString());
});

// Close after 5 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);