const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Generate a test token
const JWT_SECRET = "1645c13cd162003cc036c3bd76798574d9fdc4c71074d7ad2dfe0ff5edb53c0d710c0a1d541962fdc97842a5a64285102638763b56450a348f0ac0475466d55f";
const token = jwt.sign({ userId: '1754869526878' }, JWT_SECRET);

const ws = new WebSocket(`ws://localhost:3000/api/chat/ws?token=${token}`);

ws.on('open', function open() {
  console.log('WebSocket connection opened');
  
  // Send a simple ping message first
  const pingMessage = JSON.stringify({ type: 'ping' });
  console.log('Sending ping message:', pingMessage);
  ws.send(pingMessage);
  
  // Wait a moment and then send the actual message
  setTimeout(() => {
    const message = JSON.stringify({
      type: 'send_message',
      conversationId: 'cmff3zilc0000c96j84qzrfce',
      content: 'Hello from debug script'
    });
    console.log('Sending message:', message);
    ws.send(message);
  }, 1000);
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('WebSocket connection closed:', code, reason.toString());
});