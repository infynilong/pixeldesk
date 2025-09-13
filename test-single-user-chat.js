const WebSocket = require('ws');

async function testSingleUserChat() {
  const userId = '1754869526878'; // guest user that we know exists
  
  console.log('🧪 Testing single user chat connection...');
  console.log(`👤 User ID: ${userId}`);
  
  try {
    // First get a valid token from the auth API
    console.log('🔐 Getting WebSocket token...');
    const authResponse = await fetch('http://localhost:3000/api/chat/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    const authData = await authResponse.json();
    console.log('📡 Auth response:', authData.success ? 'Success' : authData.error);
    
    if (!authData.success) {
      console.error('❌ Failed to get token:', authData);
      return;
    }
    
    const token = authData.data.token;
    console.log('✅ Got token:', token.substring(0, 30) + '...');
    
    // Now connect to WebSocket
    const wsUrl = `ws://localhost:3000/api/chat/ws?token=${encodeURIComponent(token)}`;
    console.log('\n📡 Connecting to WebSocket...');
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', function open() {
      console.log('✅ WebSocket connection established!');
      
      // Send a ping to test basic communication
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    
    ws.on('message', function message(data) {
      const msg = JSON.parse(data.toString());
      console.log(`📨 Received message:`, msg.type);
      
      if (msg.type === 'connection_established') {
        console.log('🔗 Connection established for user:', msg.data.userId);
      } else if (msg.type === 'pong') {
        console.log('🏓 Ping-pong successful!');
        console.log('✅ Basic WebSocket communication is working!');
      }
    });
    
    ws.on('error', function error(err) {
      console.error('❌ WebSocket error:', err.message);
    });
    
    ws.on('close', function close(code, reason) {
      console.log(`🔴 WebSocket closed: ${code} ${reason?.toString()}`);
    });
    
    // Clean up after 5 seconds
    setTimeout(() => {
      console.log('\n🧹 Closing connection...');
      ws.close();
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Need to define fetch for Node.js
const fetch = require('node-fetch');

testSingleUserChat();