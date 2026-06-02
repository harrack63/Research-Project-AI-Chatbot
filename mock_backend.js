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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse request body
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    // REGISTER
    if (req.url === '/api/auth/register' && req.method === 'POST') {
      try {
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          access_token: token,
          token_type: 'Bearer',
          user: user
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Registration failed' }));
      }
      return;
    }

    // LOGIN
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      try {
        const data = JSON.parse(body);
        const user = mockUsers[data.email];
        
        if (!user || user.password !== data.password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Invalid credentials' }));
          return;
        }

        const token = `token_${Date.now()}`;
        mockTokens[token] = data.email;

        res.writeHead(200, { 'Content-Type': 'application/json' });
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
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Login failed' }));
      }
      return;
    }

    // GET CURRENT USER
    if (req.url === '/api/auth/me' && req.method === 'GET') {
      const auth = req.headers.authorization;
      const token = auth?.replace('Bearer ', '');
      
      if (!token || !mockTokens[token]) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Unauthorized' }));
        return;
      }

      const email = mockTokens[token];
      const user = mockUsers[email];

      res.writeHead(200, { 'Content-Type': 'application/json' });
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

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Logged out' }));
      return;
    }

    // CATCH ALL
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ detail: 'Not found' }));
  });
});

server.listen(PORT, () => {
  console.log(`✅ Mock backend running on http://localhost:${PORT}`);
  console.log(`\nTest credentials:`);
  console.log(`  Email: test@example.com`);
  console.log(`  Password: password123`);
  console.log(`\nOr create a new account on the frontend`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try killing the process or use a different port.`);
  }
  process.exit(1);
});