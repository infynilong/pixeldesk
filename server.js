const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/chat/ws'
  });

  // Import WebSocket handler
  const { handleWebSocketConnection } = require('./lib/websocketHandler');
  const { setWebSocketServer } = require('./lib/websocketBroadcast');
  
  // Set the WebSocket server instance for broadcasting
  setWebSocketServer(wss);
  
  wss.on('connection', (ws, req) => {
    handleWebSocketConnection(ws, req, wss);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/chat/ws`);
  });
});