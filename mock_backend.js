const http = require('http');

console.log('🚀 Starting mock backend...');

const PORT = 8000;

// Mock users database
const mockUsers = {
  'test@example.com': {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
    created_at: new Date().toISOString()
  }
};

// Mock tokens
const mockTokens = {};

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  // Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS preflight OK');
    res.writeHead(200);
    res.end();
    return;
  }

  // Collect body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    handleRequest(req, res, body);
  });
});

function handleRequest(req, res, body) {
  try {
    // LOGIN
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      const data = JSON.parse(body);
      const user = mockUsers[data.email];
      
      if (!user || user.password !== data.password) {
        console.log('❌ Login failed: invalid credentials');
        res.writeHead(401);
        res.end(JSON.stringify({ detail: 'Invalid credentials' }));
        return;
      }

      const token = `token_${Date.now()}`;
      mockTokens[token] = data.email;

      res.writeHead(200);
      res.end(JSON.stringify({
        access_token: token,
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at
        }
      }));
      console.log('✅ Login successful:', data.email);
      return;
    }

    // REGISTER
    if (req.url === '/api/auth/register' && req.method === 'POST') {
      const data = JSON.parse(body);
      const token = `token_${Date.now()}`;
      const user = {
        id: 2,
        email: data.email,
        username: data.name || data.email.split('@')[0],
        created_at: new Date().toISOString()
      };
      mockUsers[data.email] = { ...user, password: data.password };
      mockTokens[token] = data.email;

      res.writeHead(200);
      res.end(JSON.stringify({
        access_token: token,
        token_type: 'Bearer',
        user: user
      }));
      console.log('✅ Registration successful:', data.email);
      return;
    }

    // GET CURRENT USER
    if (req.url === '/api/auth/me' && req.method === 'GET') {
      const auth = req.headers.authorization;
      const token = auth?.replace('Bearer ', '');
      
      if (!token || !mockTokens[token]) {
        res.writeHead(401);
        res.end(JSON.stringify({ detail: 'Unauthorized' }));
        return;
      }

      const email = mockTokens[token];
      const user = mockUsers[email];

      res.writeHead(200);
      res.end(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      }));
      return;
    }

    // LOGOUT
    if (req.url === '/api/auth/logout' && req.method === 'POST') {
      const auth = req.headers.authorization;
      const token = auth?.replace('Bearer ', '');
      if (token) delete mockTokens[token];

      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Logged out' }));
      return;
    }

    // NOT FOUND
    console.log('⚠️  404:', req.url);
    res.writeHead(404);
    res.end(JSON.stringify({ detail: 'Not found' }));

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ detail: 'Server error' }));
  }
}

server.listen(PORT, () => {
  console.log(`✅ Mock backend running on http://localhost:${PORT}`);
  console.log(`\nTest credentials:`);
  console.log(`  Email: test@example.com`);
  console.log(`  Password: password123`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  process.exit(1);
});