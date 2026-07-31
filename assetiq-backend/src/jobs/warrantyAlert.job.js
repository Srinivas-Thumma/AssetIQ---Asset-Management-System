import cron from 'node-cron';
import { Warranty } from '../models/Warranty.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { getIO } from '../config/socket.js';

export const startWarrantyJob = () => {
  // Run daily at 01:00 AM
  cron.schedule('* 0 * * *', async () => {
    console.log('⏰ Warranty Alert Job: Running daily check...');
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const today = new Date();

      // Find warranties that are active, expiring soon, and haven't triggered an alert yet.
      // No AsyncLocalStorage store is active here, so this scans all tenants.
      const expiringWarranties = await Warranty.find({
        endDate: { $gte: today, $lte: thirtyDaysFromNow },
        status: 'active',
        alertSent: false,
      });

      console.log(`⏰ Warranty Alert Job: Found ${expiringWarranties.length} expiring warranties.`);

      for (const warranty of expiringWarranties) {
        warranty.alertSent = true;
        
        // Update warranty status to expired if the date is passed
        if (warranty.endDate < today) {
          warranty.status = 'expired';
        }

        await warranty.save();

        const asset = await Asset.findById(warranty.assetId);
        const assetName = asset ? asset.name : 'Unknown Asset';
        const assetCode = asset ? asset.assetCode : 'N/A';

        console.log(
          `🔔 ALERT: Warranty for asset "${assetName}" (${assetCode}) expires on ${warranty.endDate.toISOString().split('T')[0]}. Provider: ${warranty.provider}`
        );

        // Provision in-app notification alerts for org_admin and asset_manager users
        if (warranty.organizationId) {
          try {
            await runWithTenant(warranty.organizationId.toString(), async () => {
              const staffAdmins = await User.find({
                role: { $in: ['org_admin', 'asset_manager'] }
              });

              for (const admin of staffAdmins) {
                const notification = await Notification.create({
                  organizationId: warranty.organizationId,
                  userId: admin._id,
                  message: `Warranty for asset "${assetName}" (${assetCode}) expires on ${warranty.endDate.toISOString().split('T')[0]}. Provider: ${warranty.provider}`,
                  type: 'warranty_expiring',
                  relatedId: warranty._id
                });

                // Emit live notification event via WebSocket to target user room
                try {
                  const io = getIO();
                  io.to(`user:${admin._id.toString()}`).emit('notification:new', notification);
                } catch (socketErr) {
                  // Socket server may not be active during standalone CLI checks
                }
              }
            });
          } catch (err) {
            console.error(`❌ Failed to write notification for org ${warranty.organizationId}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Warranty Alert Job failed:', error.message);
    }
  });
  
  console.log('⚙️ Warranty Alert cron job initialized (runs daily at 1:00 AM)');
};
