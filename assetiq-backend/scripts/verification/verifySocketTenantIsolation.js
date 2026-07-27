import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import { connectDB } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';
import { initSocket } from '../../src/config/socket.js';
import { Organization } from '../../src/models/Organization.js';
import { User } from '../../src/models/User.js';
import { Plan } from '../../src/models/Plan.js';

const runSocketTenantIsolationVerification = async () => {
  console.log('🧪 Starting Socket Infrastructure & Tenant Room Isolation Test...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Setup Test Organizations
  let orgA = await Organization.findOne({ slug: 'org-a-iso-test' });
  if (!orgA) {
    orgA = await Organization.create({ name: 'Test Org A', slug: 'org-a-iso-test', planId: plan._id });
  }

  let orgB = await Organization.findOne({ slug: 'org-b-iso-test' });
  if (!orgB) {
    orgB = await Organization.create({ name: 'Test Org B', slug: 'org-b-iso-test', planId: plan._id });
  }

  // 2. Setup Test Users
  let userA = await User.findOne({ email: 'usera@orga-iso.com' });
  if (!userA) {
    userA = await User.create({
      email: 'usera@orga-iso.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: orgA._id,
      status: 'active',
    });
  }

  let userB = await User.findOne({ email: 'userb@orgb-iso.com' });
  if (!userB) {
    userB = await User.create({
      email: 'userb@orgb-iso.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: orgB._id,
      status: 'active',
    });
  }

  // 3. Generate Valid JWT Access Tokens
  const tokenA = jwt.sign({ id: userA._id, role: userA.role, organizationId: orgA._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign({ id: userB._id, role: userB.role, organizationId: orgB._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

  // 4. Spin up Test HTTP Server on Port 5099
  const app = express();
  const server = http.createServer(app);
  const ioServer = initSocket(server);

  const port = 5099;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`📡 Test Socket Server running on port ${port}`);

  const roomSnapshots = {};

  // Track room memberships when sockets connect
  ioServer.on('connection', (socket) => {
    roomSnapshots[socket.user.email] = Array.from(socket.rooms);
  });

  // 5. Connect Client Sockets with Cookie Headers
  const clientA = Client(`http://localhost:${port}`, {
    extraHeaders: { cookie: `accessToken=${tokenA}` },
    transports: ['websocket'],
  });

  const clientB = Client(`http://localhost:${port}`, {
    extraHeaders: { cookie: `accessToken=${tokenB}` },
    transports: ['websocket'],
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 6. Verify Isolation Criteria
  const roomsA = roomSnapshots['usera@orga-iso.com'] || [];
  const roomsB = roomSnapshots['userb@orgb-iso.com'] || [];

  console.log('\n--- SERVER-SIDE ROOM MEMBERSHIP AUDIT ---');
  console.log('User A (Org A) Rooms:', roomsA);
  console.log('User B (Org B) Rooms:', roomsB);

  const orgARoom = `org:${orgA._id.toString()}`;
  const orgBRoom = `org:${orgB._id.toString()}`;
  const userARoom = `user:${userA._id.toString()}`;
  const userBRoom = `user:${userB._id.toString()}`;

  let passed = true;

  // User A Checks
  if (!roomsA.includes(orgARoom)) {
    console.error(`❌ FAIL: User A missing own org room [${orgARoom}]`);
    passed = false;
  }
  if (!roomsA.includes(userARoom)) {
    console.error(`❌ FAIL: User A missing own user room [${userARoom}]`);
    passed = false;
  }
  if (roomsA.includes(orgBRoom)) {
    console.error(`❌ FAIL: User A joined Org B room [${orgBRoom}] - CROSS TENANT LEAK!`);
    passed = false;
  }

  // User B Checks
  if (!roomsB.includes(orgBRoom)) {
    console.error(`❌ FAIL: User B missing own org room [${orgBRoom}]`);
    passed = false;
  }
  if (!roomsB.includes(userBRoom)) {
    console.error(`❌ FAIL: User B missing own user room [${userBRoom}]`);
    passed = false;
  }
  if (roomsB.includes(orgARoom)) {
    console.error(`❌ FAIL: User B joined Org A room [${orgARoom}] - CROSS TENANT LEAK!`);
    passed = false;
  }

  // Cleanup
  clientA.disconnect();
  clientB.disconnect();
  await new Promise((resolve) => server.close(resolve));

  if (passed) {
    console.log('\n✅ VERIFICATION PASSED: Socket infrastructure & cross-tenant room isolation verified!');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED: Room isolation bounds violated!');
    process.exit(1);
  }
};

runSocketTenantIsolationVerification().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
