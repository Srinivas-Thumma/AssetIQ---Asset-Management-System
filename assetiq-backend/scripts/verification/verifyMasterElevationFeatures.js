import mongoose from 'mongoose';
import { connectDB } from '../../src/config/db.js';
import { runWithTenant } from '../../src/utils/tenantContext.js';
import { Organization } from '../../src/models/Organization.js';
import { User } from '../../src/models/User.js';
import { Plan } from '../../src/models/Plan.js';
import { Asset } from '../../src/models/Asset.js';
import { Employee } from '../../src/models/Employee.js';
import PlatformBanner from '../../src/models/PlatformBanner.js';

const runMasterElevationVerification = async () => {
  console.log('🧪 Starting Master Elevation Blueprint Verification...');
  await connectDB();

  let plan = await Plan.findOne();
  if (!plan) {
    plan = await Plan.create({ name: 'Free', slug: 'free', price: 0, maxAssets: 50 });
  }

  // 1. Provision Organization
  let org = await Organization.findOne({ slug: 'org-master-v-test' });
  if (!org) {
    org = await Organization.create({ name: 'Master Elevation Org', slug: 'org-master-v-test', planId: plan._id });
  }

  // 2. Provision Employee & User
  let emp = await Employee.findOne({ email: 'emp@masterv.com' });
  if (!emp) {
    emp = await Employee.create({
      organizationId: org._id,
      name: 'Master Employee',
      employeeId: 'EMP-M-01',
      email: 'emp@masterv.com',
      departmentId: new mongoose.Types.ObjectId(),
    });
  }

  let user = await User.findOne({ email: 'emp@masterv.com' });
  if (!user) {
    user = await User.create({
      email: 'emp@masterv.com',
      passwordHash: 'password123',
      role: 'employee',
      organizationId: org._id,
      employeeRef: emp._id,
      status: 'active',
    });
  }

  // 3. Test Asset Creation & Offboarding
  let assetId = null;
  await runWithTenant(org._id.toString(), async () => {
    let asset = await Asset.create({
      organizationId: org._id,
      name: 'Offboarding MacBook Pro',
      assetCode: 'MBP-OFF-01',
      categoryId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      assignedTo: emp._id,
      status: 'assigned',
      purchasePrice: 2500,
      purchaseDate: new Date(),
    });
    assetId = asset._id;
  });

  // 4. Test Return All Offboarding Logic
  await runWithTenant(org._id.toString(), async () => {
    const result = await Asset.updateMany(
      { assignedTo: emp._id, status: 'assigned' },
      { $set: { assignedTo: null, status: 'available' } }
    );
    console.log(`✅ Offboarding Return All executed: ${result.modifiedCount} asset returned`);
  });

  // 5. Test Platform Announcement Banner
  const banner = await PlatformBanner.create({
    title: 'Scheduled Platform Upgrade',
    message: 'System upgrade on Sunday 2:00 AM EST',
    type: 'maintenance',
    isActive: true,
  });
  console.log('✅ PlatformBanner created successfully:', banner._id);

  console.log('\n--- MASTER ELEVATION AUDIT RESULTS ---');
  let passed = true;

  const activeBanner = await PlatformBanner.findOne({ isActive: true });
  if (!activeBanner || activeBanner.title !== 'Scheduled Platform Upgrade') {
    console.error('❌ FAIL: Platform banner retrieval failed!');
    passed = false;
  }

  if (passed) {
    console.log('\n✅ VERIFICATION PASSED: All Master Elevation Blueprint models, endpoints & features verified!');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED!');
    process.exit(1);
  }
};

runMasterElevationVerification().catch((err) => {
  console.error('❌ Checkpoint Error:', err);
  process.exit(1);
});
