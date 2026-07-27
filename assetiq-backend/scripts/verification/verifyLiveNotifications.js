import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import { connectDB } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';
import { initSocket, getIO } from '../../src/config/socket.js';
import { Organization } from '../../src/models/Organization.js';
import { User } from '../../src/models/User.js';
import { Plan } from '../../src/models/Plan.js';
import { Notification } from '../../src/models/Notification.js';

const runLiveNotificationsVerification = async () => {
  console.log('🧪 Starting Real-Time Notifications over WebSockets Test...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Provision Test Organizations
  let orgA = await Organization.findOne({ slug: 'org-a-notif-v-test' });
  if (!orgA) {
    orgA = await Organization.create({ name: 'Notif Test Org A', slug: 'org-a-notif-v-test', planId: plan._id });
  }

  let orgB = await Organization.findOne({ slug: 'org-b-notif-v-test' });
  if (!orgB) {
    orgB = await Organization.create({ name: 'Notif Test Org B', slug: 'org-b-notif-v-test', planId: plan._id });
  }

  // 2. Provision Test Users
  let userA = await User.findOne({ email: 'adminA@orga-notif-v.com' });
  if (!userA) {
    userA = await User.create({
      email: 'adminA@orga-notif-v.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: orgA._id,
      status: 'active',
    });
  }

  let userB = await User.findOne({ email: 'adminB@orgb-notif-v.com' });
  if (!userB) {
    userB = await User.create({
      email: 'adminB@orgb-notif-v.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: orgB._id,
      status: 'active',
    });
  }

  // 3. Generate Valid JWT Tokens
  const tokenA = jwt.sign({ id: userA._id, role: userA.role, organizationId: orgA._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenB = jwt.sign({ id: userB._id, role: userB.role, organizationId: orgB._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

  // 4. Start Test Socket Server on Port 5098
  const app = express();
  const server = http.createServer(app);
  initSocket(server);

  const port = 5098;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`📡 Test Notification Socket Server running on port ${port}`);

  // 5. Connect Client Sockets
  const clientA = Client(`http://localhost:${port}`, {
    extraHeaders: { cookie: `accessToken=${tokenA}` },
    transports: ['websocket'],
  });

  const clientB = Client(`http://localhost:${port}`, {
    extraHeaders: { cookie: `accessToken=${tokenB}` },
    transports: ['websocket'],
  });

  const receivedNotificationsA = [];
  const receivedNotificationsB = [];

  clientA.on('notification:new', (notif) => {
    console.log('⚡ Client A received notification:', notif.message);
    receivedNotificationsA.push(notif);
  });

  clientB.on('notification:new', (notif) => {
    console.log('⚠️ UNEXPECTED: Client B received notification:', notif.message);
    receivedNotificationsB.push(notif);
  });

  await new Promise((resolve) => setTimeout(resolve, 1200));

  // 6. Trigger Notification for User A (Org A)
  const notifObj = await Notification.create({
    organizationId: orgA._id,
    userId: userA._id,
    message: 'TEST ALERT: Warranty for Macbook Pro expires in 5 days!',
    type: 'warranty_expiring',
  });

  // Emit WebSocket event to User A's room
  const io = getIO();
  io.to(`user:${userA._id.toString()}`).emit('notification:new', notifObj);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 7. Verify Results
  console.log('\n--- WEBSOCKET NOTIFICATION DISPATCH AUDIT ---');
  console.log(`User A Received Count: ${receivedNotificationsA.length}`);
  console.log(`User B Received Count: ${receivedNotificationsB.length}`);

  let passed = true;

  if (receivedNotificationsA.length !== 1 || receivedNotificationsA[0]._id.toString() !== notifObj._id.toString()) {
    console.error('❌ FAIL: User A did not receive expected notification via WebSocket!');
    passed = false;
  }

  if (receivedNotificationsB.length !== 0) {
    console.error('❌ FAIL: User B (Org B) received User A\'s notification - CROSS TENANT LEAK!');
    passed = false;
  }

  // Cleanup
  clientA.disconnect();
  clientB.disconnect();
  await new Promise((resolve) => server.close(resolve));

  if (passed) {
    console.log('\n✅ VERIFICATION PASSED: Real-time notifications over WebSockets verified with tenant isolation!');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED!');
    process.exit(1);
  }
};

runLiveNotificationsVerification().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
