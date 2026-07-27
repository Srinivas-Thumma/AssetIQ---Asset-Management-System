import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import { connectDB } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';
import { initSocket } from '../../src/config/socket.js';
import { Organization } from '../../src/models/Organization.js';
import { User } from '../../src/models/User.js';
import { Plan } from '../../src/models/Plan.js';
import { Asset } from '../../src/models/Asset.js';
import { Employee } from '../../src/models/Employee.js';
import { MaintenanceRequest } from '../../src/models/MaintenanceRequest.js';

const runChatPermissionsVerification = async () => {
  console.log('🧪 Starting WebSocket Chat RBAC & Permission Security Test...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Provision Test Organization
  let org = await Organization.findOne({ slug: 'org-perm-verify-test' });
  if (!org) {
    org = await Organization.create({ name: 'Permission Verification Org', slug: 'org-perm-verify-test', planId: plan._id });
  }

  // 2. Provision Admin User, Employee Profile A, Employee User A, Employee User B
  let admin = await User.findOne({ email: 'admin@perm-verify.com' });
  if (!admin) {
    admin = await User.create({
      email: 'admin@perm-verify.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: org._id,
      status: 'active',
    });
  }

  let empProfileA = await Employee.findOne({ email: 'empa@perm-verify.com' });
  if (!empProfileA) {
    empProfileA = await Employee.create({
      organizationId: org._id,
      name: 'Emp A',
      employeeId: 'EMP-A-001',
      email: 'empa@perm-verify.com',
      departmentId: new mongoose.Types.ObjectId(),
    });
  }

  let empA = await User.findOne({ email: 'empa@perm-verify.com' });
  if (!empA) {
    empA = await User.create({
      email: 'empa@perm-verify.com',
      passwordHash: 'password123',
      role: 'employee',
      organizationId: org._id,
      employeeRef: empProfileA._id,
      status: 'active',
    });
  } else if (!empA.employeeRef) {
    empA.employeeRef = empProfileA._id;
    await empA.save();
  }

  let empB = await User.findOne({ email: 'empb@perm-verify.com' });
  if (!empB) {
    empB = await User.create({
      email: 'empb@perm-verify.com',
      passwordHash: 'password123',
      role: 'employee',
      organizationId: org._id,
      status: 'active',
    });
  }

  // 3. Provision Asset assigned to Emp A, but Ticket raised by ADMIN
  let assetA = await Asset.findOne({ name: 'EmpA Assigned Workstation' });
  if (!assetA) {
    assetA = await Asset.create({
      organizationId: org._id,
      name: 'EmpA Assigned Workstation',
      assetCode: 'WS-EMP-A',
      categoryId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      assignedTo: empProfileA._id, // Points to Employee model ID
      purchasePrice: 1800,
      purchaseDate: new Date(),
      status: 'under_maintenance',
    });
  }

  // CRITICAL TEST SETUP: Request raised by ADMIN (raisedBy !== empA._id), but asset assigned to Emp A (assignedTo === empA.employeeRef)
  let requestA = await MaintenanceRequest.findOne({ description: 'Admin scheduled RAM upgrade for Emp A' });
  if (!requestA) {
    requestA = await MaintenanceRequest.create({
      organizationId: org._id,
      assetId: assetA._id,
      raisedBy: admin._id, // Raised by Admin, NOT Emp A!
      type: 'preventive',
      priority: 'medium',
      description: 'Admin scheduled RAM upgrade for Emp A',
      scheduledDate: new Date(),
    });
  }

  // 4. Generate Tokens
  const tokenAdmin = jwt.sign({ id: admin._id, role: admin.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenEmpA = jwt.sign({ id: empA._id, role: empA.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const tokenEmpB = jwt.sign({ id: empB._id, role: empB.role, organizationId: org._id }, env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

  // 5. Start Test Socket Server on Port 5093
  const app = express();
  const server = http.createServer(app);
  initSocket(server);

  const port = 5093;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`📡 Test Permission Socket Server running on port ${port}`);

  // 6. Connect Sockets
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
    console.log('✅ Emp A (Assigned Owner, Ticket raised by Admin) joined chat room:', res.room);
    joinedEmpA.push(res);
  });

  clientAdmin.on('chat:joined', (res) => {
    console.log('✅ Admin joined chat room:', res.room);
    joinedAdmin.push(res);
  });

  clientAdmin.on('chat:message', (msg) => {
    console.log('💬 Admin received chat message from assigned employee:', msg.message);
    receivedMessagesAdmin.push(msg);
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('\n--- ATTEMPT 1: Unassigned Employee B tries to join Admin-scheduled ticket for Emp A ---');
  clientEmpB.emit('chat:join', { requestId: requestA._id.toString() });

  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log('\n--- ATTEMPT 2: Assigned Employee A (employeeRef check) & Admin join chat ---');
  clientEmpA.emit('chat:join', { requestId: requestA._id.toString() });
  clientAdmin.emit('chat:join', { requestId: requestA._id.toString() });

  await new Promise((resolve) => setTimeout(resolve, 800));

  clientEmpA.emit('chat:message', { requestId: requestA._id.toString(), message: 'Thanks for scheduling this RAM upgrade, Admin!' });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 7. Audit & Validation
  console.log('\n--- CHAT SECURITY & EMPLOYEEREF AUDIT RESULTS ---');
  console.log(`Unassigned Employee B Errors Caught: ${errorsEmpB.length}`);
  console.log(`Assigned Employee A Joined via employeeRef: ${joinedEmpA.length > 0}`);
  console.log(`Admin Joined: ${joinedAdmin.length > 0}`);
  console.log(`Admin Received Chat Message Count: ${receivedMessagesAdmin.length}`);

  let passed = true;

  if (errorsEmpB.length === 0) {
    console.error('❌ FAIL: Unassigned Employee B was NOT blocked!');
    passed = false;
  }

  if (joinedEmpA.length === 0) {
    console.error('❌ FAIL: Assigned Employee A was blocked! employeeRef validation failed when raisedBy !== user._id!');
    passed = false;
  }

  if (receivedMessagesAdmin.length !== 1) {
    console.error('❌ FAIL: Chat message from assigned employee failed to deliver!');
    passed = false;
  }

  // Cleanup
  clientEmpB.disconnect();
  clientEmpA.disconnect();
  clientAdmin.disconnect();
  await new Promise((resolve) => server.close(resolve));

  if (passed) {
    console.log('\n✅ VERIFICATION PASSED: employeeRef resolution & RBAC permission guards 100% verified!');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED!');
    process.exit(1);
  }
};

runChatPermissionsVerification().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
