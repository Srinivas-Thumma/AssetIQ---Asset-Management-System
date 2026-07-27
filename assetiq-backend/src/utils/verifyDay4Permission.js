import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { initSocket } from '../config/socket.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Plan } from '../models/Plan.js';
import { Asset } from '../models/Asset.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';

const runDay4Checkpoint = async () => {
  console.log('🧪 Starting Day 4 Checkpoint: WebSocket Chat RBAC & Permission Security Test...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Provision Test Organization
  let org = await Organization.findOne({ slug: 'org-perm-test' });
  if (!org) {
    org = await Organization.create({ name: 'Permission Test Org', slug: 'org-perm-test', planId: plan._id });
  }

  // 2. Provision Admin User, Employee User A, Employee User B
  let admin = await User.findOne({ email: 'admin@perm-test.com' });
  if (!admin) {
    admin = await User.create({
      email: 'admin@perm-test.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: org._id,
      status: 'active',
    });
  }

  let empA = await User.findOne({ email: 'empa@perm-test.com' });
  if (!empA) {
    empA = await User.create({
      email: 'empa@perm-test.com',
      passwordHash: 'password123',
      role: 'employee',
      organizationId: org._id,
      status: 'active',
    });
  }

  let empB = await User.findOne({ email: 'empb@perm-test.com' });
  if (!empB) {
    empB = await User.create({
      email: 'empb@perm-test.com',
      passwordHash: 'password123',
      role: 'employee',
      organizationId: org._id,
      status: 'active',
    });
  }

  // 3. Provision Asset & Request for Employee A
  let assetA = await Asset.findOne({ name: 'EmpA Assigned Laptop' });
  if (!assetA) {
    assetA = await Asset.create({
      organizationId: org._id,
      name: 'EmpA Assigned Laptop',
      assetCode: 'LAP-EMP-A',
      categoryId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      assignedTo: empA._id,
      purchasePrice: 1200,
      purchaseDate: new Date(),
      status: 'under_maintenance',
    });
  }

  let requestA = await MaintenanceRequest.findOne({ description: 'Keyboard keys sticky for EmpA' });
  if (!requestA) {
    requestA = await MaintenanceRequest.create({
      organizationId: org._id,
      assetId: assetA._id,
      raisedBy: empA._id,
      type: 'corrective',
      priority: 'medium',
      description: 'Keyboard keys sticky for EmpA',
      scheduledDate: new Date(),
    });
  }

  // 4. Generate Tokens
  const tokenAdmin = jwt.sign({ id: admin._id, role: admin.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenEmpA = jwt.sign({ id: empA._id, role: empA.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenEmpB = jwt.sign({ id: empB._id, role: empB.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

  // 5. Start Test Socket Server on Port 5097
  const app = express();
  const server = http.createServer(app);
  initSocket(server);

  const port = 5097;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`📡 Test Permission Socket Server running on port ${port}`);

  // 6. Connect Sockets for Emp B (Unauthorized), Emp A (Authorized), and Admin (Authorized)
  const clientEmpB = Client(`http://localhost:${port}`, { extraHeaders: { cookie: `accessToken=${tokenEmpB}` }, transports: ['websocket'] });
  const clientEmpA = Client(`http://localhost:${port}`, { extraHeaders: { cookie: `accessToken=${tokenEmpA}` }, transports: ['websocket'] });
  const clientAdmin = Client(`http://localhost:${port}`, { extraHeaders: { cookie: `accessToken=${tokenAdmin}` }, transports: ['websocket'] });

  const errorsEmpB = [];
  const joinedEmpA = [];
  const joinedAdmin = [];
  const receivedMessagesAdmin = [];

  clientEmpB.on('chat:error', (err) => {
    console.log('🛡️ Emp B received expected chat:error:', err.message);
    errorsEmpB.push(err);
  });

  clientEmpA.on('chat:joined', (res) => {
    console.log('✅ Emp A joined chat room:', res.room);
    joinedEmpA.push(res);
  });

  clientAdmin.on('chat:joined', (res) => {
    console.log('✅ Admin joined chat room:', res.room);
    joinedAdmin.push(res);
  });

  clientAdmin.on('chat:message', (msg) => {
    console.log('💬 Admin received chat message:', msg.message);
    receivedMessagesAdmin.push(msg);
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('\n--- ATTEMPT 1: Employee B (Unauthorized) tries to join Employee A\'s asset chat ---');
  clientEmpB.emit('chat:join', { requestId: requestA._id.toString() });

  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log('\n--- ATTEMPT 2: Employee B (Unauthorized) tries to force-emit a chat message ---');
  clientEmpB.emit('chat:message', { requestId: requestA._id.toString(), message: 'Hacked message from unassigned employee' });

  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log('\n--- ATTEMPT 3: Employee A (Authorized Owner) & Admin join and exchange message ---');
  clientEmpA.emit('chat:join', { requestId: requestA._id.toString() });
  clientAdmin.emit('chat:join', { requestId: requestA._id.toString() });

  await new Promise((resolve) => setTimeout(resolve, 800));

  clientEmpA.emit('chat:message', { requestId: requestA._id.toString(), message: 'Hi Admin, I dropped off my laptop at Room 302.' });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 7. Audit & Validation
  console.log('\n--- CHAT SECURITY AUDIT RESULTS ---');
  console.log(`Employee B Errors Caught: ${errorsEmpB.length}`);
  console.log(`Employee A Joined: ${joinedEmpA.length > 0}`);
  console.log(`Admin Joined: ${joinedAdmin.length > 0}`);
  console.log(`Admin Received Authorized Message Count: ${receivedMessagesAdmin.length}`);

  let passed = true;

  if (errorsEmpB.length === 0) {
    console.error('❌ FAIL: Employee B was NOT blocked when attempting unauthorized join/message!');
    passed = false;
  }

  if (joinedEmpA.length === 0 || joinedAdmin.length === 0) {
    console.error('❌ FAIL: Authorized users (Emp A / Admin) were unable to join the chat room!');
    passed = false;
  }

  if (receivedMessagesAdmin.length !== 1 || receivedMessagesAdmin[0].message !== 'Hi Admin, I dropped off my laptop at Room 302.') {
    console.error('❌ FAIL: Authorized chat message failed to broadcast to participants!');
    passed = false;
  }

  // Cleanup
  clientEmpB.disconnect();
  clientEmpA.disconnect();
  clientAdmin.disconnect();
  await new Promise((resolve) => server.close(resolve));

  if (passed) {
    console.log('\n✅ DAY 4 CHECKPOINT PASSED: WebSocket RBAC & Permission Security Guards 100% Verified!');
    process.exit(0);
  } else {
    console.error('\n❌ DAY 4 CHECKPOINT FAILED!');
    process.exit(1);
  }
};

runDay4Checkpoint().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
