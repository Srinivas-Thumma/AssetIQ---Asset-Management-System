import http from 'http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/config/socket.js';
import { startWarrantyJob } from './src/jobs/warrantyAlert.job.js';
import { startHealthScoreJob } from './src/jobs/healthScore.job.js';
import { startSlaCheckJob } from './src/jobs/slaCheck.job.js';
import { Plan } from './src/models/Plan.js';
import { User } from './src/models/User.js';

// Entry point. Orchestrates startup sequence: DB connect → seed → jobs → HTTP server → Socket.IO.

//seedGlobalData() runs on every server start — it uses findOne checks before creating, so it’s idempotent. No data is duplicated. But it does hit the database on every boot.

const seedGlobalData = async () => { //Creates Free/Pro Plans and default super_admin if missing
  try {
    // 1. Seed Plans
    let freePlan = await Plan.findOne({ slug: 'free' });
    if (!freePlan) {
      freePlan = await Plan.create({
        name: 'Free Tier',
        slug: 'free',
        price: 0,
        maxAssets: 10, // Small limit for testing plan block easily
      });
      console.log('🌱 Seeded Free Tier Plan');
    }

    let proPlan = await Plan.findOne({ slug: 'pro' });
    if (!proPlan) {
      proPlan = await Plan.create({
        name: 'Professional Tier',
        slug: 'pro',
        price: 49,
        maxAssets: 500,
      });
      console.log('🌱 Seeded Professional Tier Plan');
    }

    // 2. Seed Super Admin (Bypasses tenant scope because organizationId will be null for global super admins)
    const superAdminEmail = 'superadmin@assetiq.com';
    let superAdmin = await User.findOne({ email: superAdminEmail });
    if (!superAdmin) {
      superAdmin = await User.create({
        email: superAdminEmail,
        passwordHash: 'superadmin123', // Will be hashed by pre-save User hook
        role: 'super_admin',
        organizationId: null, // Global super admin (not tied to a specific tenant)
      });
      console.log(`🌱 Seeded Default Super Admin: ${superAdminEmail} / superadmin123`);
    }
  } catch (err) {
    console.error('❌ Database Seeding Failed:', err.message);
  }
};

const startServer = async () => {
  // 1. Connect to Database
  await connectDB();

  // 2. Run Startup Seeds
  await seedGlobalData();

  // 3. Start Background Jobs
  startWarrantyJob();// registers cron - doesnt run immediately
  startHealthScoreJob(); 
  startSlaCheckJob();

  // 4. Create HTTP Server & Attach Socket.IO Infrastructure
  const server = http.createServer(app); 
  initSocket(server); // wraps Express in a raw HTTP server and attaches Socket.IO to that server. This allows Socket.IO to share the same port as Express, enabling real-time bidirectional communication alongside standard HTTP requests.

  // 5. Listen
  server.listen(env.PORT, () => {
    console.log(`🚀 AssetIQ Server running on http://localhost:${env.PORT}`);
    console.log(`📡 Health Check URL: http://localhost:${env.PORT}/health`);
    console.log(`⚡ Socket.IO Infrastructure active on port ${env.PORT}`);
  }); // starts accepting incoming HTTP requests and Socket.IO connections on the specified port.
};

startServer().catch((err) => {
  console.error('❌ Server startup crashed:', err.message);
  process.exit(1);
});
