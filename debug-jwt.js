const jwt = require('jsonwebtoken');

// Test JWT generation and verification with the same secret
const JWT_SECRET = 'your-secret-key';
const testPayload = { userId: 'test-user-123', scope: 'websocket' };

console.log('Testing JWT generation and verification...');
console.log('Payload:', testPayload);

// Generate token
const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
console.log('Generated token:', token);
console.log('Token length:', token.length);

// Try to verify the token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verified successfully:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
  console.error('Error details:', error);
}

// Test with malformed token
try {
  const malformedToken = token.substring(0, token.length - 5); // Remove last 5 chars
  console.log('\nTesting with malformed token:', malformedToken.substring(0, 50) + '...');
  const decodedMalformed = jwt.verify(malformedToken, JWT_SECRET);
  console.log('Malformed token verification (unexpected success):', decodedMalformed);
} catch (error) {
  console.log('Malformed token correctly rejected:', error.message);
}