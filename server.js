const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

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

  // Create WebSocket server just for chat (with noServer option)
  const chatWss = new WebSocket.Server({ 
    noServer: true
  });

  // Import WebSocket handler
  const { handleWebSocketConnection } = require('./lib/websocketHandler');
  const { setWebSocketServer } = require('./lib/websocketBroadcast');
  
  // Set the WebSocket server instance for broadcasting
  setWebSocketServer(chatWss);
  
  chatWss.on('connection', (ws, req) => {
    console.log('🔗 [Server] Chat WebSocket connection established');
    handleWebSocketConnection(ws, req);
  });

  // Handle WebSocket upgrades
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    
    if (pathname === '/api/chat/ws') {
      // Handle chat WebSocket connections
      chatWss.handleUpgrade(request, socket, head, (ws) => {
        chatWss.emit('connection', ws, request);
      });
    } else {
      // For other paths (like HMR), let the connection fail gracefully
      // This prevents interference with Next.js internal WebSocket handling
      console.log('🔄 [Server] Non-chat WebSocket request to:', pathname);
      socket.destroy();
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Chat WebSocket server ready on ws://${hostname}:${port}/api/chat/ws`);
    
    if (dev) {
      console.log(`> Development mode: HMR errors can be ignored - they don't affect functionality`);
    }
  });
});