const fetch = require('node-fetch');

async function testAuthToken() {
  const userId = '1754869526878';
  
  console.log('🔐 Testing WebSocket token generation...');
  console.log(`👤 User ID: ${userId}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/chat/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    const data = await response.json();
    console.log('📡 Auth API response:', data);
    
    if (data.success) {
      console.log('✅ Token generated successfully');
      console.log('🎫 Token:', data.data.token.substring(0, 50) + '...');
      return data.data.token;
    } else {
      console.error('❌ Token generation failed:', data.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error calling auth API:', error);
    return null;
  }
}

// Also test if user exists
async function testUserExists(userId) {
  console.log(`\n👤 Testing if user ${userId} exists...`);
  try {
    const response = await fetch(`http://localhost:3000/api/chat/conversations?userId=${userId}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ User exists and can access conversations');
      return true;
    } else {
      console.error('❌ User not found or error:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking user:', error);
    return false;
  }
}

async function main() {
  const userId1 = '1754869526878';
  const userId2 = '1755013917436';
  
  await testUserExists(userId1);
  await testUserExists(userId2);
  
  const token1 = await testAuthToken(userId1);
  if (token1) {
    console.log('🧪 Token can be used for WebSocket connection');
  }
}

main().catch(console.error);