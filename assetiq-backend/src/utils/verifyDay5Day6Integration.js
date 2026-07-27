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

const runDay5Day6Checkpoint = async () => {
  console.log('🧪 Starting Day 5 & 6 Checkpoint: Full Chat Integration & Reconnection Pass...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Provision Test Organization
  let org = await Organization.findOne({ slug: 'org-full-test' });
  if (!org) {
    org = await Organization.create({ name: 'Full Integration Org', slug: 'org-full-test', planId: plan._id });
  }

  // 2. Provision Roles: Org Admin, Asset Manager, Assigned Employee
  let orgAdmin = await User.findOne({ email: 'orgadmin@fulltest.com' });
  if (!orgAdmin) {
    orgAdmin = await User.create({
      email: 'orgadmin@fulltest.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: org._id,
      status: 'active',
    });
  }

  let assetManager = await User.findOne({ email: 'manager@fulltest.com' });
  if (!assetManager) {
    assetManager = await User.create({
      email: 'manager@fulltest.com',
      passwordHash: 'password123',
      role: 'asset_manager',
      organizationId: org._id,
      status: 'active',
    });
  }

  let assignedEmployee = await User.findOne({ email: 'employee@fulltest.com' });
  if (!assignedEmployee) {
    assignedEmployee = await User.create({
      email: 'employee@fulltest.com',
      passwordHash: 'password123',
      role: 'employee',
      organizationId: org._id,
      status: 'active',
    });
  }

  // 3. Provision Asset & Maintenance Ticket
  let asset = await Asset.findOne({ name: 'Corporate Workstation 01' });
  if (!asset) {
    asset = await Asset.create({
      organizationId: org._id,
      name: 'Corporate Workstation 01',
      assetCode: 'WS-001',
      categoryId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      assignedTo: assignedEmployee._id,
      purchasePrice: 2000,
      purchaseDate: new Date(),
      status: 'under_maintenance',
    });
  }

  let request = await MaintenanceRequest.findOne({ description: 'GPU overheating issue' });
  if (!request) {
    request = await MaintenanceRequest.create({
      organizationId: org._id,
      assetId: asset._id,
      raisedBy: assignedEmployee._id,
      type: 'corrective',
      priority: 'high',
      description: 'GPU overheating issue',
      scheduledDate: new Date(),
    });
  }

  // 4. Generate Tokens
  const tokenAdmin = jwt.sign({ id: orgAdmin._id, role: orgAdmin.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenManager = jwt.sign({ id: assetManager._id, role: assetManager.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenEmployee = jwt.sign({ id: assignedEmployee._id, role: assignedEmployee.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

  // 5. Start Test Socket Server on Port 5096
  const app = express();
  const server = http.createServer(app);
  initSocket(server);

  const port = 5096;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`📡 Test Integration Socket Server running on port ${port}`);

  // 6. Connect Client Sockets
  const clientAdmin = Client(`http://localhost:${port}`, { extraHeaders: { cookie: `accessToken=${tokenAdmin}` }, transports: ['websocket'] });
  const clientManager = Client(`http://localhost:${port}`, { extraHeaders: { cookie: `accessToken=${tokenManager}` }, transports: ['websocket'] });
  const clientEmployee = Client(`http://localhost:${port}`, { extraHeaders: { cookie: `accessToken=${tokenEmployee}` }, transports: ['websocket'] });

  const messagesEmployee = [];
  const messagesAdmin = [];

  clientEmployee.on('chat:message', (msg) => {
    messagesEmployee.push(msg);
  });

  clientAdmin.on('chat:message', (msg) => {
    messagesAdmin.push(msg);
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 7. Join Sockets to Chat Room
  const requestIdStr = request._id.toString();
  clientAdmin.emit('chat:join', { requestId: requestIdStr });
  clientManager.emit('chat:join', { requestId: requestIdStr });
  clientEmployee.emit('chat:join', { requestId: requestIdStr });

  await new Promise((resolve) => setTimeout(resolve, 800));

  // 8. Manager sends message -> Received by Admin and Employee
  clientManager.emit('chat:message', { requestId: requestIdStr, message: 'I have assigned Technician John to inspect the GPU.' });

  await new Promise((resolve) => setTimeout(resolve, 800));

  // 9. Day 6 Reconnection Test: Simulate Employee socket network disconnect & reconnect
  console.log('\n--- DAY 6 EDGE CASE TEST: Simulating socket disconnect & reconnect ---');
  clientEmployee.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 500));

  clientEmployee.connect();
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Auto-rejoin chat room on reconnect
  clientEmployee.emit('chat:join', { requestId: requestIdStr });
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Admin sends message post-reconnection
  clientAdmin.emit('chat:message', { requestId: requestIdStr, message: 'Technician John has replaced the GPU thermal paste.' });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 10. Audit Results
  console.log('\n--- FULL INTEGRATION & RECONNECTION AUDIT RESULTS ---');
  console.log(`Employee Received Messages Count: ${messagesEmployee.length}`);
  console.log(`Admin Received Messages Count: ${messagesAdmin.length}`);

  let passed = true;

  if (messagesEmployee.length !== 2) {
    console.error(`❌ FAIL: Employee socket missed messages post-reconnection! Expected 2, got ${messagesEmployee.length}`);
    passed = false;
  }

  if (messagesAdmin.length !== 2) {
    console.error(`❌ FAIL: Admin socket missed broadcast messages! Expected 2, got ${messagesAdmin.length}`);
    passed = false;
  }

  // Cleanup
  clientAdmin.disconnect();
  clientManager.disconnect();
  clientEmployee.disconnect();
  await new Promise((resolve) => server.close(resolve));

  if (passed) {
    console.log('\n✅ DAY 5 & 6 CHECKPOINT PASSED: Full integration, real-time chat, and reconnection edge cases 100% verified!');
    process.exit(0);
  } else {
    console.error('\n❌ DAY 5 & 6 CHECKPOINT FAILED!');
    process.exit(1);
  }
};

runDay5Day6Checkpoint().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
