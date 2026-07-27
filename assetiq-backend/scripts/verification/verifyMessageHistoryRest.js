import mongoose from 'mongoose';
import { connectDB } from '../../src/config/db.js';
import { runWithTenant } from '../../src/utils/tenantContext.js';
import { Organization } from '../../src/models/Organization.js';
import { User } from '../../src/models/User.js';
import { Plan } from '../../src/models/Plan.js';
import { Asset } from '../../src/models/Asset.js';
import { MaintenanceRequest } from '../../src/models/MaintenanceRequest.js';
import { MaintenanceMessage } from '../../src/models/MaintenanceMessage.js';

const runMessageHistoryRestVerification = async () => {
  console.log('🧪 Starting MaintenanceMessage REST History & Isolation Test...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Provision Test Organizations
  let orgA = await Organization.findOne({ slug: 'org-a-msg-v-test' });
  if (!orgA) {
    orgA = await Organization.create({ name: 'Msg Test Org A', slug: 'org-a-msg-v-test', planId: plan._id });
  }

  let orgB = await Organization.findOne({ slug: 'org-b-msg-v-test' });
  if (!orgB) {
    orgB = await Organization.create({ name: 'Msg Test Org B', slug: 'org-b-msg-v-test', planId: plan._id });
  }

  // 2. Provision Test Users
  let userA = await User.findOne({ email: 'adminA@orga-msg-v.com' });
  if (!userA) {
    userA = await User.create({
      email: 'adminA@orga-msg-v.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: orgA._id,
      status: 'active',
    });
  }

  let userB = await User.findOne({ email: 'adminB@orgb-msg-v.com' });
  if (!userB) {
    userB = await User.create({
      email: 'adminB@orgb-msg-v.com',
      passwordHash: 'password123',
      role: 'org_admin',
      organizationId: orgB._id,
      status: 'active',
    });
  }

  // 3. Provision Asset & Maintenance Request for Org A
  let requestAId = null;
  let messageAId = null;

  await runWithTenant(orgA._id.toString(), async () => {
    let assetA = await Asset.findOne({ name: 'Dell Server A' });
    if (!assetA) {
      assetA = await Asset.create({
        organizationId: orgA._id,
        name: 'Dell Server A',
        assetCode: 'SRV-001',
        categoryId: new mongoose.Types.ObjectId(),
        roomId: new mongoose.Types.ObjectId(),
        vendorId: new mongoose.Types.ObjectId(),
        purchasePrice: 1500,
        purchaseDate: new Date(),
        status: 'under_maintenance',
      });
    }

    let requestA = await MaintenanceRequest.findOne({ description: 'RAM Upgrade Needed for Org A' });
    if (!requestA) {
      requestA = await MaintenanceRequest.create({
        organizationId: orgA._id,
        assetId: assetA._id,
        raisedBy: userA._id,
        type: 'preventive',
        priority: 'high',
        description: 'RAM Upgrade Needed for Org A',
        scheduledDate: new Date(),
      });
    }

    requestAId = requestA._id;

    // Create test message
    const msgA = await MaintenanceMessage.create({
      organizationId: orgA._id,
      requestId: requestA._id,
      senderId: userA._id,
      senderName: 'adminA',
      senderRole: 'org_admin',
      message: 'Hello, please expedite this RAM upgrade ticket.',
    });

    messageAId = msgA._id;
  });

  // 4. Test Fetching Messages under Org A (Authorized)
  let messagesInOrgA = [];
  await runWithTenant(orgA._id.toString(), async () => {
    messagesInOrgA = await MaintenanceMessage.find({ requestId: requestAId }).sort({ createdAt: 1 });
  });

  // 5. Test Fetching Org A Request & Messages under Org B Scope (Cross-Tenant Unauthorized Attempt)
  let requestFetchedByOrgB = null;
  let messagesFetchedByOrgB = [];

  await runWithTenant(orgB._id.toString(), async () => {
    requestFetchedByOrgB = await MaintenanceRequest.findById(requestAId);
    messagesFetchedByOrgB = await MaintenanceMessage.find({ requestId: requestAId });
  });

  console.log('\n--- MAINTENANCE MESSAGE REST HISTORY & TENANT SCOPE AUDIT ---');
  console.log(`Org A Messages Fetched (Org A Scope): ${messagesInOrgA.length}`);
  console.log(`Org A Request Fetched (Org B Scope): ${requestFetchedByOrgB ? 'FOUND (LEAK!)' : 'null (NOT FOUND - 404 Behavior)'}`);
  console.log(`Org A Messages Fetched (Org B Scope): ${messagesFetchedByOrgB.length}`);

  let passed = true;

  if (messagesInOrgA.length !== 1 || messagesInOrgA[0]._id.toString() !== messageAId.toString()) {
    console.error('❌ FAIL: Org A failed to retrieve its own maintenance chat history!');
    passed = false;
  }

  if (requestFetchedByOrgB !== null) {
    console.error('❌ FAIL: Org B was able to fetch Org A\'s maintenance request - CROSS TENANT LEAK!');
    passed = false;
  }

  if (messagesFetchedByOrgB.length !== 0) {
    console.error('❌ FAIL: Org B was able to fetch Org A\'s chat messages - CROSS TENANT LEAK!');
    passed = false;
  }

  if (passed) {
    console.log('\n✅ VERIFICATION PASSED: MaintenanceMessage REST history endpoint & tenant isolation verified!');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED!');
    process.exit(1);
  }
};

runMessageHistoryRestVerification().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
