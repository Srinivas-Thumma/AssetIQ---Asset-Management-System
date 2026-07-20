import cron from 'node-cron';
import { Warranty } from '../models/Warranty.js';
import { Asset } from '../models/Asset.js';

export const startWarrantyJob = () => {
  // Run daily at 01:00 AM
  cron.schedule('0 1 * * *', async () => {
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
        
        // Update warranty status to expired if the date is passed (just as double-check)
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
      }
    } catch (error) {
      console.error('❌ Warranty Alert Job failed:', error.message);
    }
  });
  
  console.log('⚙️ Warranty Alert cron job initialized (runs daily at 1:00 AM)');
};
