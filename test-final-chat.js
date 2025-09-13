const WebSocket = require('ws');
const fetch = require('node-fetch');

async function testChatWithRealAuth() {
  const userId = '1754869526878'; // guest user
  
  console.log('🧪 [Test] Starting comprehensive chat test');
  console.log(`👤 [Test] User ID: ${userId}`);
  
  try {
    // Step 1: Get authentication token
    console.log('\n🔐 [Test] Step 1: Getting WebSocket token...');
    const authResponse = await fetch('http://localhost:3000/api/chat/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Auth failed: ${authResponse.status} ${errorText}`);
    }
    
    const authData = await authResponse.json();
    if (!authData.success || !authData.data?.token) {
      throw new Error('No token received: ' + JSON.stringify(authData));
    }
    
    const token = authData.data.token;
    console.log('✅ [Test] Auth token received, length:', token.length);
    
    // Step 2: Connect to WebSocket
    console.log('\n📡 [Test] Step 2: Connecting to WebSocket...');
    const wsUrl = `ws://localhost:3000/api/chat/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      let testCompleted = false;
      
      const timeout = setTimeout(() => {
        if (!testCompleted) {
          testCompleted = true;
          console.error('⏰ [Test] Test timed out');
          ws.close();
          reject(new Error('Test timed out'));
        }
      }, 15000);
      
      ws.on('open', function open() {
        console.log('✅ [Test] WebSocket connection opened');
      });
      
      ws.on('message', function message(data) {
        try {
          const msg = JSON.parse(data.toString());
          console.log(`📨 [Test] Received:`, msg.type);
          
          if (msg.type === 'connection_established') {
            console.log('🔗 [Test] Connection established for user:', msg.data.userId);
            console.log('✅ [Test] Authentication and connection successful!');
            
            // Test ping-pong
            console.log('\n🏓 [Test] Step 3: Testing ping-pong...');
            ws.send(JSON.stringify({ type: 'ping' }));
            
          } else if (msg.type === 'pong') {
            console.log('✅ [Test] Ping-pong successful!');
            console.log('\n🎉 [Test] All tests passed! Chat system is working correctly.');
            
            if (!testCompleted) {
              testCompleted = true;
              clearTimeout(timeout);
              ws.close();
              resolve('SUCCESS');
            }
          } else if (msg.type === 'error') {
            console.error('❌ [Test] Server error:', msg);
            if (!testCompleted) {
              testCompleted = true;
              clearTimeout(timeout);
              ws.close();
              reject(new Error('Server error: ' + msg.message));
            }
          }
        } catch (parseError) {
          console.error('❌ [Test] Error parsing message:', parseError);
        }
      });
      
      ws.on('error', function error(err) {
        console.error('❌ [Test] WebSocket error:', err.message);
        if (!testCompleted) {
          testCompleted = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
      
      ws.on('close', function close(code, reason) {
        console.log(`🔴 [Test] WebSocket closed: ${code} ${reason?.toString()}`);
        if (!testCompleted) {
          testCompleted = true;
          clearTimeout(timeout);
          if (code === 1008) {
            reject(new Error('Authentication failed during connection'));
          } else {
            resolve('Connection closed normally');
          }
        }
      });
    });
    
  } catch (error) {
    console.error('❌ [Test] Test failed:', error.message);
    throw error;
  }
}

// Run the test
testChatWithRealAuth()
  .then(result => {
    console.log('\n✅ [Test] Final Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ [Test] Final Error:', error.message);
    process.exit(1);
  });