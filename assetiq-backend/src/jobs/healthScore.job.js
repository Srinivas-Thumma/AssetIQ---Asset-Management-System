import cron from 'node-cron';
import { Asset } from '../models/Asset.js';
import { analyzeAssetHealth } from '../services/ai.service.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

// Assets whose health score falls below this threshold trigger a maintenance_due notification
const HEALTH_ALERT_THRESHOLD = 50;

export const startHealthScoreJob = () => {
  // '0 2 * * *' = once per day at exactly 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ AI Health Score Job: Starting nightly calculations...');
    try {
      // No AsyncLocalStorage store is active here, so this scans all tenants.
      const activeAssets = await Asset.find({ status: { $ne: 'retired' } });

      console.log(`⏰ AI Health Score Job: Found ${activeAssets.length} active assets to analyze.`);

      for (const asset of activeAssets) {
        try {
          // Force a recompute during the nightly cron job
          const analysis = await analyzeAssetHealth(asset, true);

          asset.ai = {
            healthScore: analysis.healthScore,
            insights: analysis.insights,
            lastAnalyzedAt: analysis.lastAnalyzedAt,
            predictedNextMaintenanceDate: analysis.predictedNextMaintenanceDate || null,
            failureRiskPercent: analysis.failureRiskPercent || 0,
            remainingUsefulLifeMonths: analysis.remainingUsefulLifeMonths ?? null,
            replacementRecommendation: analysis.replacementRecommendation ?? null,
            priority: analysis.priority ?? null,
          };

          // Document already has organizationId, so save is straightforward.
          await asset.save();
          console.log(`✅ Calculated health score for asset: ${asset.name} (${asset.assetCode}) -> ${analysis.healthScore}`);

          // Issue 6 fix: Create a maintenance_due notification when health drops below threshold.
          // Only notify once per nightly cycle; duplicate suppression is handled by checking whether
          // an unread maintenance_due notification already exists for this asset.
          if (analysis.healthScore < HEALTH_ALERT_THRESHOLD && asset.organizationId) {
            try {
              // Explicit organizationId filter — User model has no tenantScopePlugin
              const staffAdmins = await User.find({
                organizationId: asset.organizationId,
                role: { $in: ['org_admin', 'asset_manager'] },
              });

              for (const admin of staffAdmins) {
                // Skip if an unread maintenance_due notification already exists for this asset/user
                const existingUnread = await Notification.findOne({
                  userId: admin._id,
                  relatedId: asset._id,
                  type: 'maintenance_due',
                  read: false,
                });
                if (existingUnread) continue;

                await Notification.create({
                  organizationId: asset.organizationId,
                  userId: admin._id,
                  message: `⚠️ Asset "${asset.name}" (${asset.assetCode}) has a low health score of ${analysis.healthScore}/100. Maintenance may be required.`,
                  type: 'maintenance_due',
                  relatedId: asset._id,
                  read: false,
                });
              }

              // Emit org-level alert so the org:<orgId> room is used
              try {
                const { getIO } = await import('../config/socket.js');
                const io = getIO();
                io.to(`org:${asset.organizationId.toString()}`).emit('asset:health_alert', {
                  assetId: asset._id,
                  assetName: asset.name,
                  assetCode: asset.assetCode,
                  healthScore: analysis.healthScore,
                });
              } catch (socketErr) {
                // Socket server may not be active during standalone CLI checks
              }
            } catch (notifErr) {
              console.error(`❌ Failed to create maintenance_due notification for asset ${asset._id}:`, notifErr.message);
            }
          }
        } catch (err) {
          console.error(`❌ Failed to update health score for asset ${asset._id}:`, err.message);
        }
      }
      console.log('⏰ AI Health Score Job: Nightly recalculation complete.');
    } catch (error) {
      console.error('❌ AI Health Score Job failed:', error.message);
    }
  });

  console.log('⚙️ AI Health Score cron job initialized (runs daily at 02:00 AM — cron: "0 2 * * *")');
};
