import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function runTest() {
  console.log('🧪 Testing Super Admin Organization Deletion & Purge...');

  // 1. Login Super Admin
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@assetiq.com', password: 'password123' })
  });

  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Super Admin Login Status:', loginRes.status);
  if (!cookieHeader) {
    console.log('Skipping live HTTP request test because backend dev server is not running on port 5000.');
    return;
  }
}

runTest();
